'use server';

import { adminDb } from '@/lib/firebase/server';
import type { DashboardFilters, User, Bike } from '@/lib/types';
import { MODALITY_MAPPING, BIKE_MODALITIES_OPTIONS } from '@/lib/bike-types';
import { unstable_cache } from 'next/cache';
import { BIKE_RANGES } from '@/lib/constants/bike-ranges';
import { GENERATIONS } from '@/lib/constants/generations';

// --- NEW STRATEGY: Cross-Filtering using Denormalized Fields ---

// Helper function to build Firestore queries for BIKES based on ALL filters
// applyGeoFilters: If false, skips country/state/city filters for theft reports, but still applies owner geo filters if requested.
function applyFilters(query: FirebaseFirestore.Query, filters: DashboardFilters, applyGeoFilters: boolean = true): FirebaseFirestore.Query {
    let q = query;
    
    // 1. User/Owner Demographics & Location Filters (Applied to bikes via denormalized fields)
    if (filters.gender) {
        q = q.where('ownerGender', '==', filters.gender);
    }
    
    // We always apply owner location filters to get accurate "safe" counts based on user location
    if (filters.country) {
        q = q.where('ownerCountry', '==', filters.country);
    }
    if (filters.state) {
        q = q.where('ownerState', '==', filters.state);
    }
    if (filters.city) {
        q = q.where('ownerCity', '==', filters.city);
    }

    // Optional: Overwrite location filters specifically for theft reports if we are querying stolen bikes
    // This depends on business logic: Do we want "bikes stolen IN this state" or "stolen bikes OWNED BY people in this state"?
    // Usually, it's the latter for demographic analysis, but let's keep the option open.
    // We will stick to the owner's location for consistency across the dashboard.
    
    // 2. Bike Specific Filters
    if (filters.brand) {
        q = q.where('make', '==', filters.brand);
    }
    if (filters.modality) {
        const modalitiesToSearch = MODALITY_MAPPING[filters.modality] || [filters.modality];
        q = q.where('modality', 'in', modalitiesToSearch);
    }

    return q;
}

// Helper function to build Firestore queries for USERS based on ALL filters
function applyUserFilters(query: FirebaseFirestore.Query, filters: DashboardFilters): FirebaseFirestore.Query {
    let q = query;
    
    // 1. User Demographics & Location Filters
    if (filters.country) {
        q = q.where('country', '==', filters.country);
    }
    if (filters.state) {
        q = q.where('state', '==', filters.state);
    }
    if (filters.city) {
        q = q.where('city', '==', filters.city);
    }
    if (filters.gender) {
        q = q.where('gender', '==', filters.gender);
    }

    // 2. Bike Specific Filters (Applied to users via denormalized array fields)
    if (filters.brand) {
        q = q.where('ownedBrands', 'array-contains', filters.brand);
    }
    if (filters.modality) {
        // array-contains-any is not supported combined with array-contains in the same query if we add more array filters
        // For now, assume we just check the main modality string. If modality uses mapping, we might need client-side filtering 
        // if Firestore rejects array-contains-any combined with other complex filters.
        const modalitiesToSearch = MODALITY_MAPPING[filters.modality] || [filters.modality];
        if (modalitiesToSearch.length === 1) {
            q = q.where('ownedModalities', 'array-contains', modalitiesToSearch[0]);
        } else {
             q = q.where('ownedModalities', 'array-contains-any', modalitiesToSearch);
        }
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
    const ddmmyyyy = /^\d{8}$/;
    if (ddmmyyyy.test(dateString)) {
        const day = parseInt(dateString.substring(0, 2), 10);
        const month = parseInt(dateString.substring(2, 4), 10) - 1; 
        const year = parseInt(dateString.substring(4, 8), 10);
        date = new Date(year, month, day);
        if (!isNaN(date.getTime())) return date;
    }

    // 3. Try DD/MM/YYYY or DD-MM-YYYY
    const parts = dateString.split(/[\/\-]/);
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        if (year > 1900 && month >= 0 && month < 12 && day > 0 && day <= 31) {
             date = new Date(year, month, day);
             if (!isNaN(date.getTime())) return date;
        }
    }

    return null;
}

// Helper to parse Firebase Timestamps OR ISO Strings robustly
function parseFirestoreDate(dateField: any): Date | null {
    if (!dateField) return null;
    
    // If it's a Firebase Timestamp (has toDate method)
    if (typeof dateField.toDate === 'function') {
        return dateField.toDate();
    }
    
    // If it's a string (ISO)
    if (typeof dateField === 'string') {
        const date = new Date(dateField);
        if (!isNaN(date.getTime())) return date;
    }

    return null;
}

// Cached function to get bike status counts
export const getBikeStatusCounts = unstable_cache(
    async (filters: DashboardFilters) => {
        const db = adminDb;
        const bikesRef = db.collection('bikes');

        // Apply ALL filters (both user and bike)
        let totalQuery = applyFilters(bikesRef, filters, false);
        const stolenQuery = applyFilters(bikesRef.where('status', '==', 'stolen'), filters, true);
        const recoveredQuery = applyFilters(bikesRef.where('status', '==', 'recovered'), filters, true);

        const [totalSnapshot, stolenSnapshot, recoveredSnapshot] = await Promise.all([
            totalQuery.count().get(),
            stolenQuery.count().get(),
            recoveredQuery.count().get(),
        ]);

        const totalCount = totalSnapshot.data().count;
        const stolenCount = stolenSnapshot.data().count;
        const recoveredCount = recoveredSnapshot.data().count;

        const safeCount = Math.max(0, totalCount - (stolenCount + recoveredCount));

        return {
            stolen: stolenCount,
            recovered: recoveredCount,
            safe: safeCount, 
            totalThefts: stolenCount + recoveredCount,
        };
    },
    ['bike-status-counts'], 
    { revalidate: 1, tags: ['analytics'] } 
);

// Cached function to get top stolen brands
export const getTopStolenBrands = unstable_cache(
    async (filters: DashboardFilters) => {
        const db = adminDb;
        let query = db.collection('bikes').where('status', '==', 'stolen');
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
            .slice(0, 5); 
    },
    ['top-stolen-brands'],
    { revalidate: 1, tags: ['analytics'] } 
);

// Cached function to get thefts by modality using efficient count queries
export const getTheftsByModality = unstable_cache(
    async (filters: DashboardFilters) => {
        const db = adminDb;
        
        const targetModalities = filters.modality 
            ? BIKE_MODALITIES_OPTIONS.filter(m => m.value === filters.modality)
            : BIKE_MODALITIES_OPTIONS;

        const { modality, ...baseFilters } = filters;

        const promises = targetModalities.map(async (option) => {
            let q = db.collection('bikes').where('status', '==', 'stolen');
            q = applyFilters(q, { ...baseFilters, modality: option.value }, true);
            
            const snapshot = await q.count().get();
            
            return {
                name: option.label, 
                value: snapshot.data().count
            };
        });

        const results = await Promise.all(promises);
        
        return results
            .filter(r => r.value > 0)
            .sort((a, b) => b.value - a.value);
    },
    ['thefts-by-modality'],
    { revalidate: 1, tags: ['analytics'] } 
);

// General App Stats
export const getGeneralStats = unstable_cache(
    async (filters: DashboardFilters) => {
        const db = adminDb;
        const usersRef = db.collection('users');
        const bikesRef = db.collection('bikes');

        // Los totales SÍ se filtran por la combinación exacta seleccionada en el tablero.
        let totalUsersQuery = applyUserFilters(usersRef, filters);
        let totalBikesQuery = applyFilters(bikesRef, filters, false);

        // La gráfica de crecimiento histórico NO se filtra para evitar 
        // requerir decenas de índices compuestos en Firebase.
        // Siempre mostrará el crecimiento global del ecosistema en los últimos 30 días.
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Dependiendo de cómo se guardó en la BD vieja o nueva, 
        // a veces createdAt es String ISO, a veces Timestamp de Firestore.
        // Consultamos todo lo de los últimos 30 días (y posteriores) 
        // usando ambas comparaciones si es necesario, o resolvemos en memoria.
        // Dado que la colección no es infinita para 30 días, podemos optimizar 
        // con un select() y procesar en memoria si es necesario para evitar fallos de formato.
        
        // Asumimos que los strings ISO son el estándar nuevo, pero los Timestamps existen
        // Firebase no puede mezclar >= para strings y timestamps al mismo tiempo fácilmente.
        // Si tienes bikes guardadas como Timestamps y otras como strings, la consulta fallará o excluirá datos.
        
        // Haremos la consulta global sin filtro de fecha en la BD, pero con select('createdAt') 
        // para minimizar ancho de banda, y filtraremos los 30 días en memoria. Esto asegura 
        // capturar tanto ISO strings como Timestamps de Firebase de manera infalible.
        
        const [usersSnapshot, bikesSnapshot, allUsersSnapshot, allBikesSnapshot] = await Promise.all([
            totalUsersQuery.count().get(),
            totalBikesQuery.count().get(),
            usersRef.select('createdAt').get(), 
            bikesRef.select('createdAt').get(), 
        ]);

        const dailyCounts: { [key: string]: { usersCount: number, bikesCount: number } } = {};
        
        // Process All Users, filter in memory for robustness against Date format changes
        allUsersSnapshot.forEach(doc => {
            const data = doc.data();
            const dateObj = parseFirestoreDate(data.createdAt);
            
            if (dateObj && dateObj >= thirtyDaysAgo) {
                const date = dateObj.toISOString().split('T')[0];
                if (!dailyCounts[date]) dailyCounts[date] = { usersCount: 0, bikesCount: 0 };
                dailyCounts[date].usersCount += 1;
            }
        });

        // Process All Bikes, filter in memory for robustness against Timestamp vs String differences
        allBikesSnapshot.forEach(doc => {
            const data = doc.data();
            const dateObj = parseFirestoreDate(data.createdAt);
            
            if (dateObj && dateObj >= thirtyDaysAgo) {
                const date = dateObj.toISOString().split('T')[0];
                if (!dailyCounts[date]) dailyCounts[date] = { usersCount: 0, bikesCount: 0 };
                dailyCounts[date].bikesCount += 1;
            }
        });

        const dailyGrowth = Object.entries(dailyCounts)
            .map(([date, counts]) => ({ date, ...counts }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return {
            totalUsers: usersSnapshot.data().count,
            totalBikes: bikesSnapshot.data().count,
            activeUsers: 0, 
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
        
        query = applyFilters(query, filters, true);

        // We use theftReport location here to see where things are actually stolen
        const snapshot = await query.select('theftReport.state', 'theftReport.city').get();
        
        if (snapshot.empty) return [];

        const locationCounts: { [key: string]: number } = {};
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const state = data.theftReport?.state?.trim(); 
            const city = data.theftReport?.city?.trim();   
            
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
            .slice(0, 10); 
    },
    ['top-theft-locations'],
    { revalidate: 1, tags: ['analytics'] } 
);

// Cached function to get user demographics
export const getUserDemographics = unstable_cache(
    async (filters: DashboardFilters) => {
        const db = adminDb;
        let query = applyUserFilters(db.collection('users'), filters);

        const snapshot = await query.select('birthDate', 'gender', 'state', 'country', 'city').get();
        
        if (snapshot.empty) {
            return {
                averageAge: 0,
                averageAgeByGender: [],
                genderDistribution: [],
                topLocations: [],
                generationsDistribution: {}
            };
        }

        let totalAge = 0;
        let validAgeCount = 0;
        const genderCounts: Record<string, number> = {};
        const ageSumByGender: Record<string, number> = {};
        const ageCountByGender: Record<string, number> = {};
        const locationCounts: Record<string, number> = {};
        const generationsDistribution: Record<string, number> = {};

        const today = new Date();

        snapshot.forEach(doc => {
            const data = doc.data();
            
            let gender = data.gender || 'No especificado';
            gender = gender.charAt(0).toUpperCase() + gender.slice(1);
            genderCounts[gender] = (genderCounts[gender] || 0) + 1;

            if (data.birthDate) {
                const birthDate = parseFlexibleDate(data.birthDate);
                
                if (birthDate) {
                    let age = today.getFullYear() - birthDate.getFullYear();
                    const m = today.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                    }
                    if (age > 0 && age < 120) { 
                        totalAge += age;
                        validAgeCount++;
                        
                        ageSumByGender[gender] = (ageSumByGender[gender] || 0) + age;
                        ageCountByGender[gender] = (ageCountByGender[gender] || 0) + 1;

                        const birthYear = birthDate.getFullYear();
                        const generation = Object.entries(GENERATIONS).find(
                            ([_, range]) => birthYear >= range.min && birthYear <= range.max
                        );
                        if (generation) {
                            const genKey = generation[0]; 
                            generationsDistribution[genKey] = (generationsDistribution[genKey] || 0) + 1;
                        }
                    }
                }
            }

            const state = data.state?.trim();
            const country = data.country?.trim();
            const city = data.city?.trim(); // Include city
            
            // Format Location: "City, State, Country" or variations
            let locParts = [];
            if(city) locParts.push(city);
            if(state) locParts.push(state);
            if(country && !state && !city) locParts.push(country); // Only show country if others are missing to save space

            if (locParts.length > 0) {
                const key = locParts.join(', ');
                locationCounts[key] = (locationCounts[key] || 0) + 1;
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
            topLocations,
            generationsDistribution
        };
    },
    ['user-demographics'],
    { revalidate: 1, tags: ['analytics'] } 
);

// Cached function to get market metrics
export const getMarketMetrics = unstable_cache(
    async (filters: DashboardFilters) => {
        const db = adminDb;
        let query: FirebaseFirestore.Query = db.collection('bikes'); 
        
        query = applyFilters(query, filters, false); 

        const snapshot = await query.select('make', 'modality', 'appraisedValue').get();
        
        if (snapshot.empty) {
            return {
                topBrands: [],
                modalities: [],
                totalValue: 0,
                averageValue: 0,
                rangesDistribution: {}
            };
        }

        const brandCounts: Record<string, number> = {};
        const modalityCounts: Record<string, number> = {};
        const rangesDistribution: Record<string, number> = {};
        let totalValue = 0;
        let validValueCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            
            const brand = data.make;
            if (brand) brandCounts[brand] = (brandCounts[brand] || 0) + 1;

            const modality = data.modality;
            if (modality) modalityCounts[modality] = (modalityCounts[modality] || 0) + 1;

            const value = data.appraisedValue;
            if (typeof value === 'number' && value > 0) {
                totalValue += value;
                validValueCount++;

                const range = Object.entries(BIKE_RANGES).find(
                    ([_, r]) => value >= r.min && value <= r.max
                );
                if (range) {
                    const rangeKey = range[0]; 
                    rangesDistribution[rangeKey] = (rangesDistribution[rangeKey] || 0) + 1;
                }
            }
        });

        const topBrands = Object.entries(brandCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

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
            averageValue,
            rangesDistribution
        };
    },
    ['market-metrics'],
    { revalidate: 1, tags: ['analytics'] }
);

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

export const getMarketingPotential = unstable_cache(
    async () => {
        const db = adminDb;
        const usersRef = db.collection('users');
        
        // Contamos el total global para sacar el porcentaje real
        const totalSnapshot = await usersRef.count().get();
        const totalUsers = totalSnapshot.data().count;

        // Iteramos todos los usuarios seleccionando solo los campos necesarios.
        // Al NO tener filtros, esta consulta es estable, no requiere índices extra
        // y se procesa rápido porque el payload de red es minúsculo.
        const usersSnapshot = await usersRef.select('fcmTokens', 'notificationPreferences').get();
        
        let contactableUsers = 0;
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            const hasTokens = Array.isArray(data.fcmTokens) && data.fcmTokens.length > 0;
            // Si notificationPreferences no existe o marketing no está explícitamente en falso, es true
            const marketingConsent = data.notificationPreferences?.marketing !== false; 

            if (hasTokens && marketingConsent) {
                contactableUsers++;
            }
        });

        return {
            totalUsers,
            contactableUsers,
            percentage: totalUsers > 0 ? (contactableUsers / totalUsers) * 100 : 0
        };
    },
    ['marketing-potential-global'], // Nuevo cache key para aislarlo de los filtros
    { revalidate: 1, tags: ['analytics'] }
);