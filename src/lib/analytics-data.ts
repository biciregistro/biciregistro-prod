'use server';

import { adminDb } from '@/lib/firebase/server';
import type { DashboardFilters, User } from '@/lib/types';
import { MODALITY_MAPPING, BIKE_MODALITIES_OPTIONS } from '@/lib/bike-types';
import { unstable_cache } from 'next/cache';

// Helper function to build Firestore queries based on filters
// applyGeoFilters: If false, skips country/state filters (useful for counting total bikes that don't have theft reports)
function applyFilters(query: FirebaseFirestore.Query, filters: DashboardFilters, applyGeoFilters: boolean = true): FirebaseFirestore.Query {
    let q = query;
    
    if (applyGeoFilters) {
        if (filters.country) {
            q = q.where('theftReport.country', '==', filters.country);
        }
        if (filters.state) {
            q = q.where('theftReport.state', '==', filters.state);
        }
    }

    if (filters.brand) {
        q = q.where('make', '==', filters.brand);
    }
    if (filters.modality) {
        // Use mapping for legacy data
        const modalitiesToSearch = MODALITY_MAPPING[filters.modality] || [filters.modality];
        q = q.where('modality', 'in', modalitiesToSearch);
    }
    // Note: Gender filter requires a more complex setup (data duplication or joins),
    // so it's excluded from these initial queries as discussed.
    return q;
}

// Helper for User filters
function applyUserFilters(query: FirebaseFirestore.Query, filters: DashboardFilters): FirebaseFirestore.Query {
    let q = query;
    if (filters.country) {
        q = q.where('country', '==', filters.country);
    }
    if (filters.state) {
        q = q.where('state', '==', filters.state);
    }
    return q;
}

// Helper to parse dates in various formats (ISO, DDMMYYYY, DD/MM/YYYY)
function parseFlexibleDate(dateString: string): Date | null {
    if (!dateString) return null;

    // 1. Try standard Date parsing first (ISO YYYY-MM-DD or standard strings)
    let date = new Date(dateString);
    if (!isNaN(date.getTime())) return date;

    // 2. Try DDMMYYYY (8 digits continuous)
    // Example: 19091986
    const ddmmyyyy = /^\d{8}$/;
    if (ddmmyyyy.test(dateString)) {
        const day = parseInt(dateString.substring(0, 2), 10);
        const month = parseInt(dateString.substring(2, 4), 10) - 1; // Month is 0-indexed in JS
        const year = parseInt(dateString.substring(4, 8), 10);
        date = new Date(year, month, day);
        if (!isNaN(date.getTime())) return date;
    }

    // 3. Try DD/MM/YYYY or DD-MM-YYYY
    const parts = dateString.split(/[\/\-]/);
    if (parts.length === 3) {
        // Assume Day-Month-Year order for latin locales if not ISO
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        // Basic validation for reasonable year to avoid confusing YYYY-MM-DD split by '-'
        if (year > 1900 && month >= 0 && month < 12 && day > 0 && day <= 31) {
             date = new Date(year, month, day);
             if (!isNaN(date.getTime())) return date;
        }
    }

    return null;
}

// Cached function to get bike status counts
export const getBikeStatusCounts = unstable_cache(
    async (filters: DashboardFilters) => {
        const db = adminDb;
        const bikesRef = db.collection('bikes');

        // 1. Get Total Universe of Bikes
        // We do NOT apply geo filters here because 'safe' bikes don't have location data usually.
        // This ensures we count ALL bikes in the system that match the brand/modality.
        let totalQuery = applyFilters(bikesRef, filters, false);

        // 2. Get Stolen & Recovered counts
        // Here we DO apply geo filters because theft reports have location data.
        const stolenQuery = applyFilters(bikesRef.where('status', '==', 'stolen'), filters, true);
        const recoveredQuery = applyFilters(bikesRef.where('status', '==', 'recovered'), filters, true);

        // Execute queries in parallel
        const [totalSnapshot, stolenSnapshot, recoveredSnapshot] = await Promise.all([
            totalQuery.count().get(),
            stolenQuery.count().get(),
            recoveredQuery.count().get(),
        ]);

        const totalCount = totalSnapshot.data().count;
        const stolenCount = stolenSnapshot.data().count;
        const recoveredCount = recoveredSnapshot.data().count;

        // 3. Calculate 'Safe' by deduction
        // Safe = Total - (Stolen + Recovered)
        // This robustly handles bikes with undefined status or 'safe' status.
        // If filters reduce stolen count (e.g. specific state), safe count will appear larger relative to it,
        // which represents "Bikes in the system vs Stolen in this region", which is a valid metric.
        const safeCount = Math.max(0, totalCount - (stolenCount + recoveredCount));

        return {
            stolen: stolenCount,
            recovered: recoveredCount,
            safe: safeCount, 
            totalThefts: stolenCount + recoveredCount,
        };
    },
    ['bike-status-counts'], // Cache key
    { revalidate: 1, tags: ['analytics'] } // Changed to 1 second
);

// Cached function to get top stolen brands
export const getTopStolenBrands = unstable_cache(
    async (filters: DashboardFilters) => {
        const db = adminDb;
        // Start with base query for stolen bikes
        let query = db.collection('bikes').where('status', '==', 'stolen');
        
        // Apply centralized filters
        query = applyFilters(query, filters, true);

        const snapshot = await query.select('make').get();
        if (snapshot.empty) return [];

        const brandCounts: { [key: string]: number } = {};
        snapshot.forEach(doc => {
            const brand = doc.data().make;
            if (brand) {
                brandCounts[brand] = (brandCounts[brand] || 0) + 1;
            }
        });

        return Object.entries(brandCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5); // Return top 5
    },
    ['top-stolen-brands'],
    { revalidate: 1, tags: ['analytics'] } // Changed to 1 second
);

// Cached function to get thefts by modality using efficient count queries
export const getTheftsByModality = unstable_cache(
    async (filters: DashboardFilters) => {
        const db = adminDb;
        
        // If a modality filter is active, we only query that one. 
        // Otherwise we query all master options.
        const targetModalities = filters.modality 
            ? BIKE_MODALITIES_OPTIONS.filter(m => m.value === filters.modality)
            : BIKE_MODALITIES_OPTIONS;

        // Create a copy of filters WITHOUT modality to avoid double filtering conflict
        const { modality, ...baseFilters } = filters;

        const promises = targetModalities.map(async (option) => {
            let q = db.collection('bikes').where('status', '==', 'stolen');
            
            // Force modality for this iteration
            // We apply geo filters (true) because we are querying thefts
            q = applyFilters(q, { ...baseFilters, modality: option.value }, true);
            
            const snapshot = await q.count().get();
            
            return {
                name: option.label, // Use friendly label
                value: snapshot.data().count
            };
        });

        const results = await Promise.all(promises);
        
        // Filter out zero values and sort descending
        return results
            .filter(r => r.value > 0)
            .sort((a, b) => b.value - a.value);
    },
    ['thefts-by-modality'],
    { revalidate: 1, tags: ['analytics'] } // Changed to 1 second
);

// NEW: General App Stats
export const getGeneralStats = unstable_cache(
    async (filters: DashboardFilters) => {
        const db = adminDb;
        const usersRef = db.collection('users');
        const bikesRef = db.collection('bikes');

        let totalUsersQuery = applyUserFilters(usersRef, filters);
        let totalBikesQuery = applyFilters(bikesRef, filters, false);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentUsersQuery = applyUserFilters(usersRef, filters)
            .where('createdAt', '>=', thirtyDaysAgo.toISOString());

        const [usersSnapshot, bikesSnapshot, recentUsersSnapshot] = await Promise.all([
            totalUsersQuery.count().get(),
            totalBikesQuery.count().get(),
            recentUsersQuery.get(),
        ]);

        const dailyCounts: { [key: string]: number } = {};
        recentUsersSnapshot.forEach(doc => {
            const user = doc.data() as User;
            if (user.createdAt) {
                const date = new Date(user.createdAt).toISOString().split('T')[0];
                dailyCounts[date] = (dailyCounts[date] || 0) + 1;
            }
        });

        const dailyGrowth = Object.entries(dailyCounts)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return {
            totalUsers: usersSnapshot.data().count,
            totalBikes: bikesSnapshot.data().count,
            activeUsers: 0, // Placeholder as we don't track login activity yet
            dailyGrowth: dailyGrowth
        };
    },
    ['general-stats'],
    { revalidate: 1, tags: ['analytics'] }
);

// Cached function to get top theft locations
export const getTopTheftLocations = unstable_cache(
    async (filters: DashboardFilters) => {
        const db = adminDb;
        let query = db.collection('bikes').where('status', '==', 'stolen');
        
        query = applyFilters(query, filters, true); // Apply geo filters

        const snapshot = await query.select('theftReport.state', 'theftReport.city').get();
        
        if (snapshot.empty) return [];

        const locationCounts: { [key: string]: number } = {};
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const state = data.theftReport?.state?.trim(); // Normalize
            const city = data.theftReport?.city?.trim();   // Normalize
            
            let key = "Ubicación No Registrada";

            if (state && city) {
                key = `${city}, ${state}`;
            } else if (state) {
                key = `Desconocido, ${state}`;
            } else if (city) {
                key = `${city}, (Estado Desc.)`;
            }

            locationCounts[key] = (locationCounts[key] || 0) + 1;
        });

        return Object.entries(locationCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10
    },
    ['top-theft-locations'],
    { revalidate: 1, tags: ['analytics'] } // Changed to 1 second
);

// Cached function to get user demographics
export const getUserDemographics = unstable_cache(
    async (filters: DashboardFilters) => {
        const db = adminDb;
        let query = applyUserFilters(db.collection('users'), filters);

        const snapshot = await query.select('birthDate', 'gender', 'state', 'country').get();
        
        if (snapshot.empty) {
            return {
                averageAge: 0,
                averageAgeByGender: [],
                genderDistribution: [],
                topLocations: []
            };
        }

        let totalAge = 0;
        let validAgeCount = 0;
        const genderCounts: Record<string, number> = {};
        const ageSumByGender: Record<string, number> = {};
        const ageCountByGender: Record<string, number> = {};
        const locationCounts: Record<string, number> = {};

        const today = new Date();

        snapshot.forEach(doc => {
            const data = doc.data();
            
            // Gender (Normalize)
            let gender = data.gender || 'No especificado';
            // Capitalize first letter
            gender = gender.charAt(0).toUpperCase() + gender.slice(1);
            genderCounts[gender] = (genderCounts[gender] || 0) + 1;

            // Age Calculation using flexible parsing
            if (data.birthDate) {
                const birthDate = parseFlexibleDate(data.birthDate);
                
                if (birthDate) {
                    let age = today.getFullYear() - birthDate.getFullYear();
                    const m = today.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                    }
                    if (age > 0 && age < 120) { // Sanity check
                        totalAge += age;
                        validAgeCount++;
                        
                        // Accumulate age by gender
                        ageSumByGender[gender] = (ageSumByGender[gender] || 0) + age;
                        ageCountByGender[gender] = (ageCountByGender[gender] || 0) + 1;
                    }
                }
            }

            // Location
            const state = data.state?.trim();
            const country = data.country?.trim();
            if (state && country) {
                const key = `${state}, ${country}`;
                locationCounts[key] = (locationCounts[key] || 0) + 1;
            } else if (state) {
                locationCounts[state] = (locationCounts[state] || 0) + 1;
            }
        });

        const averageAge = validAgeCount > 0 ? Math.round(totalAge / validAgeCount) : 0;

        const averageAgeByGender = Object.keys(ageSumByGender).map(g => ({
            gender: g,
            average: Math.round(ageSumByGender[g] / ageCountByGender[g])
        }));

        const genderDistribution = Object.entries(genderCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const topLocations = Object.entries(locationCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            averageAge,
            averageAgeByGender,
            genderDistribution,
            topLocations
        };
    },
    ['user-demographics'],
    { revalidate: 1, tags: ['analytics'] } // Changed to 1 second
);

// Cached function to get market metrics
export const getMarketMetrics = unstable_cache(
    async (filters: DashboardFilters) => {
        const db = adminDb;
        // Fix: Explicitly type query as Query to prevent TS assignment error when reassigning below
        let query: FirebaseFirestore.Query = db.collection('bikes'); 
        
        // Apply filters (Geo is ignored to include 'safe' bikes, Brand/Modality applied)
        query = applyFilters(query, filters, false); 

        const snapshot = await query.select('make', 'modality', 'appraisedValue').get();
        
        if (snapshot.empty) {
            return {
                topBrands: [],
                modalities: [],
                totalValue: 0,
                averageValue: 0
            };
        }

        const brandCounts: Record<string, number> = {};
        const modalityCounts: Record<string, number> = {};
        let totalValue = 0;
        let validValueCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            
            // Brands
            const brand = data.make;
            if (brand) brandCounts[brand] = (brandCounts[brand] || 0) + 1;

            // Modalities
            const modality = data.modality;
            if (modality) modalityCounts[modality] = (modalityCounts[modality] || 0) + 1;

            // Value
            const value = data.appraisedValue;
            if (typeof value === 'number' && value > 0) {
                totalValue += value;
                validValueCount++;
            }
        });

        // Process Top Brands
        const topBrands = Object.entries(brandCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Process Modalities
        const totalBikes = snapshot.size;
        const modalities = Object.entries(modalityCounts)
            .map(([name, count]) => ({ 
                name, 
                count, 
                percentage: (count / totalBikes) * 100 
            }))
            .sort((a, b) => b.count - a.count);

        const averageValue = validValueCount > 0 ? totalValue / validValueCount : 0;

        return {
            topBrands,
            modalities,
            totalValue,
            averageValue
        };
    },
    ['market-metrics'],
    { revalidate: 1, tags: ['analytics'] }
);

// NEW: Fraud Prevention Stats
export const getFraudPreventionStats = unstable_cache(
    async () => {
        const doc = await adminDb.collection('stats').doc('global').get();
        return {
            totalSearches: doc.data()?.totalSearches || 0
        };
    },
    ['fraud-stats'],
    { revalidate: 1, tags: ['analytics'] }
);

// NEW: Marketing Potential Stats
export const getMarketingPotential = unstable_cache(
    async (filters: DashboardFilters) => {
        const db = adminDb;
        let query = applyUserFilters(db.collection('users'), filters);
        
        // Count total users matching filters first
        const totalSnapshot = await query.count().get();
        const totalUsers = totalSnapshot.data().count;

        // Count users with marketing consent
        const consentQuery = query.where('notificationPreferences.marketing', '==', true);
        const consentSnapshot = await consentQuery.count().get();
        const contactableUsers = consentSnapshot.data().count;

        return {
            totalUsers,
            contactableUsers,
            percentage: totalUsers > 0 ? (contactableUsers / totalUsers) * 100 : 0
        };
    },
    ['marketing-potential'],
    { revalidate: 1, tags: ['analytics'] }
);
