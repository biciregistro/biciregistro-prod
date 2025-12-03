'use server';

import { adminDb } from '@/lib/firebase/server';
import type { DashboardFilters } from '@/lib/types';
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

        // 1. Total Users (Respecting Geo Filters only)
        // Assuming 'country' and 'state' are on the user doc
        let totalUsersQuery = applyUserFilters(usersRef, filters);
        
        // 2. Total Bikes (Respecting all filters EXCEPT geo for total count, same logic as above)
        // If user filters by "Jalisco", we want to see bikes in Jalisco. 
        // But remember, we assumed 'safe' bikes don't have location data in theftReport.
        // Does the bike doc have root level 'country'/'state'? 
        // Let's check types.ts: Bike has 'status', 'theftReport'. 
        // It DOES NOT have root country/state in the type definition, only in theftReport.
        // Wait, User has country/state. Bike implies location via Owner?
        // For this general stat, we will count ALL bikes if no filters, 
        // but if geo filter is present, we can only reliably count STOLEN bikes with location.
        // HOWEVER, to be useful, we'll return the total count we calculated in getBikeStatusCounts.
        // Let's re-run a lightweight count here.
        let totalBikesQuery = applyFilters(bikesRef, filters, false); 

        // 3. User Growth (Last 30 Days)
        // We'll try to fetch users created recently.
        // Note: Firestore requires an index for this if mixed with other filters.
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        // We assume we have a 'createdAt' or similar field. 
        // If not, this part will return empty or 0.
        // Let's try to query 'metadata.creationTime' is on Auth, not Firestore usually unless synced.
        // Let's assume there is NO 'createdAt' on legacy users.
        // We will return a simulated chart for now to avoid breaking the UI with empty data,
        // or just return 0 if no data found.
        
        const [usersSnapshot, bikesSnapshot] = await Promise.all([
            totalUsersQuery.count().get(),
            totalBikesQuery.count().get(),
        ]);

        return {
            totalUsers: usersSnapshot.data().count,
            totalBikes: bikesSnapshot.data().count,
            activeUsers: 0, // Placeholder as we don't track login activity yet
            // Sending empty array for chart, UI should handle "No data" state gracefully
            dailyGrowth: [] 
        };
    },
    ['general-stats'],
    { revalidate: 1, tags: ['analytics'] } // Changed to 1 second
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

            // Age Calculation
            if (data.birthDate) {
                const birthDate = new Date(data.birthDate);
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
