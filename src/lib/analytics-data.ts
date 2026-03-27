'use server';

import { adminDb } from '@/lib/firebase/server';
import type { DashboardFilters, User, Bike } from '@/lib/types';
import { MODALITY_MAPPING, BIKE_MODALITIES_OPTIONS } from '@/lib/bike-types';
import { unstable_cache } from 'next/cache';
import { BIKE_RANGES } from '@/lib/constants/bike-ranges';
import { GENERATIONS } from '@/lib/constants/generations';

// --- NUEVA ESTRATEGIA DE FILTRADO CON CONTEXTOS GEOGRÁFICOS ---

type GeoContext = 'owner' | 'incident' | 'none';

/**
 * Construye consultas para BICICLETAS aplicando filtros demográficos, de mercado y opcionalmente de seguridad.
 * @param query La referencia a la colección o consulta base.
 * @param filters Los filtros provenientes del Dashboard.
 * @param geoContext Define qué campos geográficos se usan ('owner' = residencia del dueño, 'incident' = lugar del robo, 'none' = ignora geografía).
 */
function applyBikeFilters(
    query: FirebaseFirestore.Query, 
    filters: DashboardFilters, 
    geoContext: GeoContext
): FirebaseFirestore.Query {
    let q = query;
    
    // 1. Filtros Demográficos del Dueño (Siempre aplican al perfil del usuario)
    if (filters.gender) {
        q = q.where('ownerGender', '==', filters.gender);
    }
    
    // 2. Filtros Geográficos Contextuales
    if (geoContext === 'owner') {
        // Buscamos bicicletas basadas en DONDE VIVE el dueño
        if (filters.country) q = q.where('ownerCountry', '==', filters.country);
        if (filters.state) q = q.where('ownerState', '==', filters.state);
        if (filters.city) q = q.where('ownerCity', '==', filters.city);
    } else if (geoContext === 'incident') {
        // Buscamos bicicletas robadas basadas en DÓNDE OCURRIÓ el robo
        if (filters.country) q = q.where('theftReport.country', '==', filters.country);
        if (filters.state) q = q.where('theftReport.state', '==', filters.state);
        if (filters.city) q = q.where('theftReport.city', '==', filters.city);
    }
    
    // 3. Filtros de Mercado (Características de la Bicicleta)
    if (filters.brand) {
        q = q.where('make', '==', filters.brand);
    }
    if (filters.modality) {
        const modalitiesToSearch = MODALITY_MAPPING[filters.modality] || [filters.modality];
        q = q.where('modality', 'in', modalitiesToSearch);
    }

    return q;
}

/**
 * Construye consultas para USUARIOS aplicando filtros demográficos y opcionalmente de mercado.
 * NUNCA usa contexto de incidentes porque un usuario no es un robo.
 */
function applyUserFilters(query: FirebaseFirestore.Query, filters: DashboardFilters): FirebaseFirestore.Query {
    let q = query;
    
    // 1. Filtros Demográficos y Geográficos (Residencia del usuario)
    if (filters.country) q = q.where('country', '==', filters.country);
    if (filters.state) q = q.where('state', '==', filters.state);
    if (filters.city) q = q.where('city', '==', filters.city);
    if (filters.gender) q = q.where('gender', '==', filters.gender);

    // 2. Filtros de Mercado (Solo aplica si el usuario PUSO un filtro de bicicleta)
    // Si no hay filtro de marca/modalidad, cuenta TODOS los usuarios del estado, tengan bicis o no.
    if (filters.brand) {
        q = q.where('ownedBrands', 'array-contains', filters.brand);
    }
    if (filters.modality) {
        const modalitiesToSearch = MODALITY_MAPPING[filters.modality] || [filters.modality];
        if (modalitiesToSearch.length === 1) {
            q = q.where('ownedModalities', 'array-contains', modalitiesToSearch[0]);
        } else {
             q = q.where('ownedModalities', 'array-contains-any', modalitiesToSearch);
        }
    }

    return q;
}

// Helper to parse dates in various formats
function parseFlexibleDate(dateString: string): Date | null {
    if (!dateString) return null;
    let date = new Date(dateString);
    if (!isNaN(date.getTime())) return date;

    const ddmmyyyy = /^\d{8}$/;
    if (ddmmyyyy.test(dateString)) {
        const day = parseInt(dateString.substring(0, 2), 10);
        const month = parseInt(dateString.substring(2, 4), 10) - 1; 
        const year = parseInt(dateString.substring(4, 8), 10);
        date = new Date(year, month, day);
        if (!isNaN(date.getTime())) return date;
    }

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
    if (typeof dateField.toDate === 'function') return dateField.toDate();
    if (typeof dateField === 'string') {
        const date = new Date(dateField);
        if (!isNaN(date.getTime())) return date;
    }
    return null;
}

// --- ANALÍTICAS (Optimizadas con Contextos Geográficos) ---

export const getBikeStatusCounts = unstable_cache(
    async (filters: DashboardFilters) => {
        const db = adminDb;
        const bikesRef = db.collection('bikes');

        // 1. Salud del Ecosistema (Basado en DÓNDE VIVE EL DUEÑO)
        // Para saber qué porcentaje de las bicis de los residentes de X zona están seguras vs robadas.
        let totalQuery = applyBikeFilters(bikesRef, filters, 'owner');
        const residentStolenQuery = applyBikeFilters(bikesRef.where('status', '==', 'stolen'), filters, 'owner');
        const residentRecoveredQuery = applyBikeFilters(bikesRef.where('status', '==', 'recovered'), filters, 'owner');

        // 2. Incidentes Policiales (Basado en DÓNDE OCURRIÓ EL ROBO)
        // Para los contadores puros de criminalidad en la zona (Tasa de Recuperación, Top Marcas Robadas, etc.)
        const incidentStolenQuery = applyBikeFilters(bikesRef.where('status', '==', 'stolen'), filters, 'incident');
        const incidentRecoveredQuery = applyBikeFilters(bikesRef.where('status', '==', 'recovered'), filters, 'incident');

        const [
            totalSnapshot, 
            residentStolenSnapshot, 
            residentRecoveredSnapshot,
            incidentStolenSnapshot,
            incidentRecoveredSnapshot
        ] = await Promise.all([
            totalQuery.count().get(),
            residentStolenQuery.count().get(),
            residentRecoveredQuery.count().get(),
            incidentStolenQuery.count().get(),
            incidentRecoveredQuery.count().get(),
        ]);

        const totalCount = totalSnapshot.data().count;
        const residentStolenCount = residentStolenSnapshot.data().count;
        const residentRecoveredCount = residentRecoveredSnapshot.data().count;
        
        // Bicicletas Seguras: Total de bicis de los residentes - (Robadas a residentes + Recuperadas de residentes)
        const safeCount = Math.max(0, totalCount - (residentStolenCount + residentRecoveredCount));

        // Para la UI de "Monitor de Seguridad", entregamos los contadores de INCIDENTES (dónde pasó).
        // Pero para la Barra de Salud, entregamos 'safeCount' que es coherente con el universo de residentes.
        return {
            stolen: incidentStolenSnapshot.data().count,
            recovered: incidentRecoveredSnapshot.data().count,
            safe: safeCount, 
            totalThefts: incidentStolenSnapshot.data().count + incidentRecoveredSnapshot.data().count,
        };
    },
    ['bike-status-counts-context'], 
    { revalidate: 1, tags: ['analytics'] } 
);

export const getTopStolenBrands = unstable_cache(
    async (filters: DashboardFilters) => {
        const db = adminDb;
        let query = db.collection('bikes').where('status', '==', 'stolen');
        
        // CONTEXTO: Incidente (Marcas más robadas EN esta zona)
        query = applyBikeFilters(query, filters, 'incident');

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
    ['top-stolen-brands-context'],
    { revalidate: 1, tags: ['analytics'] } 
);

export const getTheftsByModality = unstable_cache(
    async (filters: DashboardFilters) => {
        const db = adminDb;
        
        const targetModalities = filters.modality 
            ? BIKE_MODALITIES_OPTIONS.filter(m => m.value === filters.modality)
            : BIKE_MODALITIES_OPTIONS;

        const { modality, ...baseFilters } = filters;

        const promises = targetModalities.map(async (option) => {
            let q = db.collection('bikes').where('status', '==', 'stolen');
            
            // CONTEXTO: Incidente (Modalidades más robadas EN esta zona)
            q = applyBikeFilters(q, { ...baseFilters, modality: option.value }, 'incident');
            
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
    ['thefts-by-modality-context'],
    { revalidate: 1, tags: ['analytics'] } 
);

export const getGeneralStats = unstable_cache(
    async (filters: DashboardFilters) => {
        const db = adminDb;
        const usersRef = db.collection('users');
        const bikesRef = db.collection('bikes');

        // Total Usuarios: TODOS los registrados en la zona (a menos que se filtre por marca/modalidad)
        let totalUsersQuery = applyUserFilters(usersRef, filters);
        
        // Total Bicicletas: Las bicis que "viven" en la zona (Contexto: Dueño)
        let totalBikesQuery = applyBikeFilters(bikesRef, filters, 'owner');

        // Crecimiento Histórico: GLOBAL (Sin filtros, para evitar saturación de índices en Firestore)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const [usersSnapshot, bikesSnapshot, allUsersSnapshot, allBikesSnapshot] = await Promise.all([
            totalUsersQuery.count().get(),
            totalBikesQuery.count().get(),
            usersRef.select('createdAt').get(), 
            bikesRef.select('createdAt').get(), 
        ]);

        const dailyCounts: { [key: string]: { usersCount: number, bikesCount: number } } = {};
        
        allUsersSnapshot.forEach(doc => {
            const data = doc.data();
            const dateObj = parseFirestoreDate(data.createdAt);
            if (dateObj && dateObj >= thirtyDaysAgo) {
                const date = dateObj.toISOString().split('T')[0];
                if (!dailyCounts[date]) dailyCounts[date] = { usersCount: 0, bikesCount: 0 };
                dailyCounts[date].usersCount += 1;
            }
        });

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
    ['general-stats-context'],
    { revalidate: 1, tags: ['analytics'] }
);

export const getTopTheftLocations = unstable_cache(
    async (filters: DashboardFilters) => {
        const db = adminDb;
        let query = db.collection('bikes').where('status', '==', 'stolen');
        
        // CONTEXTO: Incidente (Queremos saber dónde pasan los robos de las bicis filtradas)
        query = applyBikeFilters(query, filters, 'incident');

        const snapshot = await query.select('theftReport.state', 'theftReport.city').get();
        
        if (snapshot.empty) return [];

        const locationCounts: { [key: string]: number } = {};
        
        // Aquí aplicamos jerarquía inteligente igual que en demografía
        // Si hay un filtro de Estado aplicado, agrupamos por Municipio
        // Si no hay filtro, agrupamos por Estado
        const isStateFiltered = !!filters.state;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const state = data.theftReport?.state?.trim(); 
            const city = data.theftReport?.city?.trim();   
            
            let key = "No Registrada";

            if (isStateFiltered) {
                if (city) {
                    key = `${city}`; // Mostramos solo municipio si el estado ya es el contexto
                } else if (state) {
                    key = `Desconocido en ${state}`;
                }
            } else {
                if (state) {
                    key = state; // Agrupamos todo a nivel Estado
                } else if (city) {
                    key = city; // Caso raro: tiene municipio pero no estado
                }
            }

            if (key !== "No Registrada") {
                locationCounts[key] = (locationCounts[key] || 0) + 1;
            }
        });

        return Object.entries(locationCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); 
    },
    ['top-theft-locations-context'],
    { revalidate: 1, tags: ['analytics'] } 
);

export const getUserDemographics = unstable_cache(
    async (filters: DashboardFilters) => {
        const db = adminDb;
        
        // CONTEXTO: Residencia del usuario (Aplica filtros si hay marca/modalidad, si no, agarra a todos los de la zona)
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
        const isStateFiltered = !!filters.state;

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
            const city = data.city?.trim(); 
            
            // JERARQUÍA INTELIGENTE DE UBICACIONES
            // Si el admin filtró por Estado (ej. Querétaro), la tarjeta mostrará los Municipios (ej. El Marqués)
            // Si el admin NO filtró por Estado (Panorama Global), la tarjeta agrupará a todos por Estado (ej. Querétaro consolidado)
            let locKey = "";
            
            if (isStateFiltered) {
                // Modo "Zoom": Ya sabemos en qué estado estamos, mostramos la distribución interna
                if (city) {
                    locKey = city; 
                } else if (state) {
                    locKey = `(Municipio no especificado)`;
                }
            } else {
                // Modo "Macro": Mostramos la fuerza por estados/provincias
                if (state) {
                    locKey = state;
                } else if (country && !state && !city) {
                    locKey = country;
                }
            }

            if (locKey) {
                locationCounts[locKey] = (locationCounts[locKey] || 0) + 1;
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
    ['user-demographics-context'],
    { revalidate: 1, tags: ['analytics'] } 
);

export const getMarketMetrics = unstable_cache(
    async (filters: DashboardFilters) => {
        const db = adminDb;
        let query: FirebaseFirestore.Query = db.collection('bikes'); 
        
        // CONTEXTO: Dueño (El mercado se mide por la residencia de los propietarios y sus activos)
        query = applyBikeFilters(query, filters, 'owner'); 

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
    ['market-metrics-context'],
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
        
        // Métrica global, no afectada por filtros geográficos.
        const totalSnapshot = await usersRef.count().get();
        const totalUsers = totalSnapshot.data().count;

        const usersSnapshot = await usersRef.select('fcmTokens', 'notificationPreferences').get();
        
        let contactableUsers = 0;
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            const hasTokens = Array.isArray(data.fcmTokens) && data.fcmTokens.length > 0;
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
    ['marketing-potential-global'], 
    { revalidate: 1, tags: ['analytics'] }
);

export const getSecurityMapData = unstable_cache(
    async (filters: DashboardFilters) => {
        const db = adminDb;
        const bikesRef = db.collection('bikes');
        
        // Base query: only stolen bikes, applying context of the incident
        let query = applyBikeFilters(bikesRef.where('status', '==', 'stolen'), filters, 'incident');
        const snapshot = await query.get();
        
        if (snapshot.empty) return [];

        const mapDataPromises = snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const report = data.theftReport || {};
            
            let victimOrigin = "No especificado";
            let victimState = data.ownerState || "";
            let victimCity = data.ownerCity || "";
            
            if (victimCity || victimState) {
                victimOrigin = [victimCity, victimState].filter(Boolean).join(", ");
            } else if (data.userId) {
                 try {
                     const userDoc = await db.collection('users').doc(data.userId).get();
                     if (userDoc.exists) {
                         const userData = userDoc.data();
                         if (userData) {
                             victimCity = userData.city || "";
                             victimState = userData.state || "";
                             if (victimCity || victimState) {
                                 victimOrigin = [victimCity, victimState].filter(Boolean).join(", ");
                             }
                         }
                     }
                 } catch (e) {
                     console.error("Error fetching user origin for map", e);
                 }
            }

            return {
                id: doc.id,
                lat: report.lat || null,
                lng: report.lng || null,
                state: report.state || 'Desconocido',
                city: report.city || 'Desconocido',
                date: report.date || null,
                brand: data.make || 'Desconocido',
                modality: data.modality || 'Desconocida',
                victimOrigin,
                victimState,
                victimCity
            };
        });

        return Promise.all(mapDataPromises);
    },
    ['security-map-context'],
    { revalidate: 1, tags: ['analytics'] }
);