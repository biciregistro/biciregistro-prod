'use server';

import { adminDb } from '@/lib/firebase/server';
import type { DashboardFilters, User, Bike, ComponentAnalyticsData, BikeComponents, ComponentDetail } from '@/lib/types';
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
    if (filters.range) {
        q = q.where('priceRange', '==', filters.range);
    }
    if (filters.modelYearBucket) {
        q = q.where('modelYearBucket', '==', filters.modelYearBucket);
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

    // 2. Filtros de Mercado (Arrays)
    // Firestore LIMITACIÓN CATASTRÓFICA: Solo permite UN (1) 'array-contains' o 'array-contains-any' por consulta.
    // SOLUCIÓN: Aplicaremos el filtro de array que sea "más restrictivo" a nivel DB, el resto en memoria.

    let arrayFilterApplied = false;

    if (filters.brand && !arrayFilterApplied) {
        q = q.where('ownedBrands', 'array-contains', filters.brand);
        arrayFilterApplied = true;
    }

    if (filters.modality && !arrayFilterApplied) {
        const modalitiesToSearch = MODALITY_MAPPING[filters.modality] || [filters.modality];
        if (modalitiesToSearch.length === 1) {
            q = q.where('ownedModalities', 'array-contains', modalitiesToSearch[0]);
        } else {
            q = q.where('ownedModalities', 'array-contains-any', modalitiesToSearch);
        }
        arrayFilterApplied = true;
    }

    if (filters.range && !arrayFilterApplied) {
        q = q.where('ownedPriceRanges', 'array-contains', filters.range);
        arrayFilterApplied = true;
    }

    if (filters.modelYearBucket && !arrayFilterApplied) {
        q = q.where('ownedModelYears', 'array-contains', filters.modelYearBucket);
        arrayFilterApplied = true;
    }

    return q;
}

/**
 * Puesto que Firestore solo permite 1 array-contains, filtramos el resto en memoria.
 * @param userData Los datos del documento del usuario devueltos por Firestore.
 * @param filters Los filtros aplicados en el Dashboard.
 * @returns boolean indicando si el usuario pasa TODOS los filtros.
 */
function passesMemoryUserFilters(userData: any, filters: DashboardFilters): boolean {
    if (filters.brand && (!userData.ownedBrands || !userData.ownedBrands.includes(filters.brand))) return false;

    if (filters.modality) {
        const modalitiesToSearch = MODALITY_MAPPING[filters.modality] || [filters.modality];
        if (!userData.ownedModalities || !modalitiesToSearch.some((m: string) => userData.ownedModalities.includes(m))) return false;
    }

    if (filters.range && (!userData.ownedPriceRanges || !userData.ownedPriceRanges.includes(filters.range))) return false;

    if (filters.modelYearBucket && (!userData.ownedModelYears || !userData.ownedModelYears.includes(filters.modelYearBucket))) return false;

    return true;
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
        // FIX: Necesitamos saber cuántas están en inventario para restarlas del SafeCount
        const residentInventoryQuery = applyBikeFilters(bikesRef.where('status', '==', 'inventory'), filters, 'owner');

        // 2. Incidentes Policiales (Basado en DÓNDE OCURRIÓ EL ROBO)
        // Para los contadores puros de criminalidad en la zona (Tasa de Recuperación, Top Marcas Robadas, etc.)
        const incidentStolenQuery = applyBikeFilters(bikesRef.where('status', '==', 'stolen'), filters, 'incident');
        const incidentRecoveredQuery = applyBikeFilters(bikesRef.where('status', '==', 'recovered'), filters, 'incident');

        const [
            totalSnapshot,
            residentStolenSnapshot,
            residentRecoveredSnapshot,
            residentInventorySnapshot,
            incidentStolenSnapshot,
            incidentRecoveredSnapshot
        ] = await Promise.all([
            totalQuery.count().get(),
            residentStolenQuery.count().get(),
            residentRecoveredQuery.count().get(),
            residentInventoryQuery.count().get(),
            incidentStolenQuery.count().get(),
            incidentRecoveredQuery.count().get(),
        ]);

        const totalCount = totalSnapshot.data().count;
        const residentStolenCount = residentStolenSnapshot.data().count;
        const residentRecoveredCount = residentRecoveredSnapshot.data().count;
        const residentInventoryCount = residentInventorySnapshot.data().count;

        // Bicicletas Seguras: Total - (Robadas + Recuperadas + En Inventario)
        // De esta forma, el ecosistema no se ve mágicamente "súper seguro" por culpa del inventario de tiendas
        const safeCount = Math.max(0, totalCount - (residentStolenCount + residentRecoveredCount + residentInventoryCount));

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

        // FIX: Cambiamos totalBikesQuery.count() a get() para poder filtrar en memoria las `inventory`
        // y descargamos solo el campo status para optimizar.
        const [usersDataSnapshot, bikesSnapshot, allUsersSnapshot, allBikesSnapshot] = await Promise.all([
            totalUsersQuery.select('ownedBrands', 'ownedModalities', 'ownedPriceRanges', 'ownedModelYears').get(),
            totalBikesQuery.select('status').get(),
            usersRef.select('createdAt', 'lastLoginAt').get(),
            bikesRef.select('createdAt', 'status').get(),
        ]);

        let filteredUsersCount = 0;
        usersDataSnapshot.forEach(doc => {
            if (passesMemoryUserFilters(doc.data(), filters)) {
                filteredUsersCount++;
            }
        });

        // FIX: Contador de bicis ignorando el inventario
        let activeBikesCount = 0;
        bikesSnapshot.forEach(doc => {
            if (doc.data().status !== 'inventory') {
                activeBikesCount++;
            }
        });

        const dailyCounts: { [key: string]: { usersCount: number, bikesCount: number, activeUsersCount: number } } = {};
        let totalActiveUsersLast30Days = 0;

        allUsersSnapshot.forEach(doc => {
            const data = doc.data();
            const createdAtObj = parseFirestoreDate(data.createdAt);
            const lastLoginAtObj = parseFirestoreDate(data.lastLoginAt);

            if (createdAtObj && createdAtObj >= thirtyDaysAgo) {
                const date = createdAtObj.toISOString().split('T')[0];
                if (!dailyCounts[date]) dailyCounts[date] = { usersCount: 0, bikesCount: 0, activeUsersCount: 0 };
                dailyCounts[date].usersCount += 1;
            }

            if (lastLoginAtObj && lastLoginAtObj >= thirtyDaysAgo) {
                const date = lastLoginAtObj.toISOString().split('T')[0];
                if (!dailyCounts[date]) dailyCounts[date] = { usersCount: 0, bikesCount: 0, activeUsersCount: 0 };
                dailyCounts[date].activeUsersCount += 1;
                totalActiveUsersLast30Days += 1;
            }
        });

        allBikesSnapshot.forEach(doc => {
            const data = doc.data();
            // FIX: La gráfica de crecimiento de bicis también ignora el inventario
            if (data.status !== 'inventory') {
                const dateObj = parseFirestoreDate(data.createdAt);
                if (dateObj && dateObj >= thirtyDaysAgo) {
                    const date = dateObj.toISOString().split('T')[0];
                    if (!dailyCounts[date]) dailyCounts[date] = { usersCount: 0, bikesCount: 0, activeUsersCount: 0 };
                    dailyCounts[date].bikesCount += 1;
                }
            }
        });

        const dailyGrowth = Object.entries(dailyCounts)
            .map(([date, counts]) => ({ date, ...counts }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return {
            totalUsers: filteredUsersCount,
            totalBikes: activeBikesCount, // Usamos el conteo en memoria
            activeUsers: totalActiveUsersLast30Days,
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

        const snapshot = await query.select('birthDate', 'gender', 'state', 'country', 'city', 'ownedBrands', 'ownedModalities', 'ownedPriceRanges', 'ownedModelYears').get();

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

            // Filtro en memoria
            if (!passesMemoryUserFilters(data, filters)) return;

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

        // FIX: Seleccionamos el 'status' para poder ignorar las bicis de inventario
        const snapshot = await query.select('make', 'modality', 'appraisedValue', 'modelYear', 'priceRange', 'status').get();

        if (snapshot.empty) {
            return {
                topBrands: [],
                modalities: [],
                totalValue: 0,
                averageValue: 0,
                rangesDistribution: {},
                modelYearsDistribution: [],
                averageModelYear: 0
            };
        }

        const brandCounts: Record<string, number> = {};
        const modalityCounts: Record<string, number> = {};
        const rangesDistribution: Record<string, number> = {};
        const modelYearCounts: Record<string, number> = {};

        let totalValue = 0;
        let validValueCount = 0;
        let totalValidYears = 0;
        let sumOfValidYears = 0;
        let activeBikesCount = 0; // Conteo real ignorando el inventario

        const currentYear = new Date().getFullYear();

        snapshot.forEach(doc => {
            const data = doc.data();

            // FIX PRINCIPAL: Ignorar el estatus 'inventory' para no sesgar el mercado
            if (data.status === 'inventory') return;

            activeBikesCount++;

            const brand = data.make;
            if (brand) brandCounts[brand] = (brandCounts[brand] || 0) + 1;

            const modality = data.modality;
            if (modality) modalityCounts[modality] = (modalityCounts[modality] || 0) + 1;

            // En lugar de recalcular al vuelo basándose en appraisedValue, 
            // usamos directamente el valor pre-calculado que se usó para el filtro en DB.
            const rangeKey = data.priceRange;
            if (rangeKey && rangeKey !== 'unknown') {
                rangesDistribution[rangeKey] = (rangesDistribution[rangeKey] || 0) + 1;
            }

            const value = data.appraisedValue;
            if (typeof value === 'number' && value > 0) {
                totalValue += value;
                validValueCount++;
            }

            // --- MODEL YEAR BUCKETING LOGIC ---
            if (data.modelYear) {
                const year = parseInt(data.modelYear, 10);

                // Excluimos años absurdos pero mantenemos desde los 1900s y hasta 1 año en el futuro
                if (!isNaN(year) && year >= 1900 && year <= currentYear + 1) {

                    // Cálculo matemático exacto para el promedio real del parque
                    totalValidYears++;
                    sumOfValidYears += year;

                    // Lógica de Agrupación (Buckets de 5 años)
                    if (year <= 1990) {
                        const yearKey = "≤ 1990";
                        modelYearCounts[yearKey] = (modelYearCounts[yearKey] || 0) + 1;
                    } else {
                        // Calcula el límite superior del cubo de 5 años (ej. 2023 -> 2025)
                        const bucketUpperLimit = Math.ceil(year / 5) * 5;
                        const bucketLowerLimit = bucketUpperLimit - 4;
                        const yearKey = `${bucketLowerLimit} - ${bucketUpperLimit}`;

                        modelYearCounts[yearKey] = (modelYearCounts[yearKey] || 0) + 1;
                    }
                }
            }
        });

        const topBrands = Object.entries(brandCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const modalities = Object.entries(modalityCounts)
            .map(([name, count]) => ({
                name,
                count,
                // Usamos el conteo real en lugar de snapshot.size
                percentage: activeBikesCount > 0 ? (count / activeBikesCount) * 100 : 0
            }))
            .sort((a, b) => b.count - a.count);

        const averageValue = validValueCount > 0 ? totalValue / validValueCount : 0;
        const averageModelYear = totalValidYears > 0 ? Math.round(sumOfValidYears / totalValidYears) : 0;

        // Transformar y ordenar el histograma de más antiguo a más reciente
        const modelYearsDistribution = Object.entries(modelYearCounts)
            .map(([year, count]) => ({ year, count }))
            .sort((a, b) => {
                // "≤ 1990" siempre al inicio
                if (a.year.startsWith('≤')) return -1;
                if (b.year.startsWith('≤')) return 1;

                // Extraemos el primer año del string (ej "2016 - 2020" -> 2016) para ordenar numéricamente
                const yearA = parseInt(a.year.split(' ')[0], 10);
                const yearB = parseInt(b.year.split(' ')[0], 10);

                return yearA - yearB;
            });

        return {
            topBrands,
            modalities,
            totalValue,
            averageValue,
            rangesDistribution,
            modelYearsDistribution,
            averageModelYear
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

export const getQualitativeSecurityData = unstable_cache(
    async (filters: DashboardFilters) => {
        const db = adminDb;
        const bikesRef = db.collection('bikes');

        // Traer solo las bicicletas robadas aplicando los filtros del contexto de incidentes
        let query = applyBikeFilters(bikesRef.where('status', '==', 'stolen'), filters, 'incident');

        // Seleccionamos solo los campos necesarios para ahorrar lectura en Firestore
        const snapshot = await query.select('theftReport.date', 'theftReport.details', 'theftReport.thiefDetails').get();

        if (snapshot.empty) return [];

        return snapshot.docs.map(doc => {
            const data = doc.data();
            const report = data.theftReport || {};

            return {
                id: doc.id,
                date: report.date || null,
                details: report.details || null,
                thiefDetails: report.thiefDetails || null,
            };
        }).filter(item => item.details || item.thiefDetails); // Filtrar solo los que tengan texto útil
    },
    ['qualitative-security-data-context'],
    { revalidate: 1, tags: ['analytics'] }
);

const defaultIndicatorRow = {
    indicator1: [],
    indicator2: [],
    indicator3: [],
};

const defaultComponentAnalyticsData: ComponentAnalyticsData = {
    totalBikes: 0,
    frameMaterial: { ...defaultIndicatorRow },
    brakes: { ...defaultIndicatorRow },
    drivetrain: { ...defaultIndicatorRow },
    fork: { ...defaultIndicatorRow },
    shock: { ...defaultIndicatorRow },
    tires: { ...defaultIndicatorRow },
    grips: { ...defaultIndicatorRow },
    saddle: { ...defaultIndicatorRow },
    pedals: { ...defaultIndicatorRow },
};

// Helper para transformar un Record<string, number> a ChartDataItem[]
const toChartData = (data: Record<string, number>): { name: string; value: number }[] => {
    const sorted = Object.entries(data)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    if (sorted.length <= 5) return sorted;

    const top5 = sorted.slice(0, 5);
    const othersValue = sorted.slice(5).reduce((acc, item) => acc + item.value, 0);

    if (othersValue > 0) {
        // Regla de negocio: Si "Otros" supera al 5to, lo reemplaza.
        if (top5.length === 5 && othersValue > top5[4].value) {
            const others = top5.pop()!;
            return [...top5.slice(0, 4), { name: 'Otros', value: othersValue + others.value }].sort((a, b) => b.value - a.value);
        }
        return [...top5, { name: 'Otros', value: othersValue }];
    }
    return top5;
};


// --- INICIO DE REFACTORIZACIÓN COMPLETA ---

// Helper Genérico y Avanzado para transformar datos agregados en formato de gráfico con desglose
const buildChartData = (
    data: Record<string, number>,
    detailedDataMap?: Map<string, { name: string, value: number, model?: string }[]>,
    limit = 5
): { name: string; value: number; detailedData?: { name: string; model?: string; value: number }[] }[] => {
    const sorted = Object.entries(data)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    if (sorted.length <= limit) {
        return sorted.map(item => ({
            ...item,
            detailedData: detailedDataMap?.get(item.name)?.sort((a, b) => b.value - a.value),
        }));
    }

    const top = sorted.slice(0, limit - 1);
    const others = sorted.slice(limit - 1);
    const othersValue = others.reduce((acc, item) => acc + item.value, 0);

    // El desglose de "Otros" es la lista de items que lo componen, aplanados si tienen sub-desglose
    const othersDetailedData: { name: string; model?: string; value: number }[] = [];
    others.forEach(item => {
        const details = detailedDataMap?.get(item.name);
        if (details && details.length > 0) {
            details.forEach(detail => {
                othersDetailedData.push({
                    name: detail.model ? detail.name : item.name,
                    model: detail.model || detail.name,
                    value: detail.value,
                });
            });
        } else {
            othersDetailedData.push({
                name: item.name,
                value: item.value,
            });
        }
    });
    othersDetailedData.sort((a, b) => b.value - a.value);

    const final = top.map(item => ({
        ...item,
        detailedData: detailedDataMap?.get(item.name)?.sort((a, b) => b.value - a.value),
    }));

    if (othersValue > 0) {
        final.push({
            name: 'Otros',
            value: othersValue,
            detailedData: othersDetailedData,
        });
    }

    return final.sort((a,b) => b.value - a.value);
};

// Helpers para convertir estructuras agregadas Map-of-Map a mapas planos requeridos por buildChartData
const convertToBrandToModelsDetailedMap = (brandToModelsMap: Map<string, Map<string, number>>): Map<string, { name: string; value: number }[]> => {
    const result = new Map<string, { name: string; value: number }[]>();
    for (const [brand, modelsMap] of brandToModelsMap.entries()) {
        const modelsArray = Array.from(modelsMap.entries()).map(([model, count]) => ({
            name: model,
            value: count
        }));
        result.set(brand, modelsArray);
    }
    return result;
};

const convertToModelToBrandsDetailedMap = (modelToBrandsMap: Map<string, Map<string, { model: string; count: number }>>): Map<string, { name: string; model: string; value: number }[]> => {
    const result = new Map<string, { name: string; model: string; value: number }[]>();
    for (const [modelKey, brandsMap] of modelToBrandsMap.entries()) {
        const brandsArray = Array.from(brandsMap.entries()).map(([brand, info]) => ({
            name: brand,
            model: info.model,
            value: info.count
        }));
        result.set(modelKey, brandsArray);
    }
    return result;
};


export const getComponentAnalytics = unstable_cache(
    async (filters: DashboardFilters): Promise<ComponentAnalyticsData> => {
        const db = adminDb;
        let query: FirebaseFirestore.Query = db.collection('bikes');

        // Proyección de campos optimizada
        query = query.select('make', 'modality', 'frameMaterial', 'components', 'status');

        // Filtros de base (demográficos, etc.)
        if (filters.analysisMode === 'market' || !filters.analysisMode) {
            query = applyBikeFilters(query, filters, 'owner');
        }

        const snapshot = await query.get();
        if (snapshot.empty) {
            return defaultComponentAnalyticsData;
        }

        // --- Estructuras de Agregación Jerárquica ---
        let totalBikes = 0;

        // Para: Fila 'frameMaterial'
        const frameMaterialCounts: Record<string, number> = {};
        const carbonBikeMakes: Record<string, number> = {};
        const aluminumBikeMakes: Record<string, number> = {};
        
        // Para: Filas de componentes
        const componentBrandCounts: Record<string, Record<string, number>> = {};
        const componentModelCounts: Record<string, Record<string, number>> = {};
        const componentBikeMakes: Record<string, Record<string, number>> = {};

        // Para desgloses de marcas de componentes (Marca -> Modelos) por categoría
        const brandToModelsByCategory: Record<string, Map<string, Map<string, number>>> = {};

        // Para desgloses de modelos (Modelo -> Marcas que lo usan) por categoría
        const modelToBrandsByCategory: Record<string, Map<string, Map<string, { model: string; count: number }>>> = {};

        const componentCategories: (keyof BikeComponents)[] = ['brakes', 'drivetrain', 'fork', 'shock', 'tires', 'grips', 'saddle', 'pedals'];
        componentCategories.forEach(cat => {
            componentBrandCounts[cat] = {};
            componentModelCounts[cat] = {};
            componentBikeMakes[cat] = {};
            brandToModelsByCategory[cat] = new Map();
            modelToBrandsByCategory[cat] = new Map();
        });

        // --- Bucle Único de Agregación ---
        snapshot.forEach((doc) => {
            const bike = doc.data() as Bike;
            if (bike.status === 'inventory') return;
            totalBikes++;

            // 1. Material del Cuadro
            if (bike.frameMaterial) {
                frameMaterialCounts[bike.frameMaterial] = (frameMaterialCounts[bike.frameMaterial] || 0) + 1;
                if (bike.make) {
                    if (bike.frameMaterial === 'Carbono') {
                        carbonBikeMakes[bike.make] = (carbonBikeMakes[bike.make] || 0) + 1;
                    }
                    if (bike.frameMaterial === 'Aluminio') {
                        aluminumBikeMakes[bike.make] = (aluminumBikeMakes[bike.make] || 0) + 1;
                    }
                }
            }

            // 2. Componentes
            if (bike.components) {
                componentCategories.forEach(category => {
                    const component: ComponentDetail | undefined = bike.components?.[category];
                    if (!component || component.isNotApplicable) return;

                    const brand = component.brand || 'Genérico';
                    const model = component.model;

                    // Conteo para `indicator1`: Distribución de Marcas
                    componentBrandCounts[category][brand] = (componentBrandCounts[category][brand] || 0) + 1;

                    // Conteo para `indicator2`: Top 5 Modelos
                    if (model) {
                        const modelKey = `${brand} ${model}`;
                        componentModelCounts[category][modelKey] = (componentModelCounts[category][modelKey] || 0) + 1;
                        
                        // Poblar mapa para desglose de Modelos -> Marcas de forma agrupada e aislada
                        const modelMap = modelToBrandsByCategory[category];
                        if (!modelMap.has(modelKey)) {
                            modelMap.set(modelKey, new Map());
                        }
                        const brandMap = modelMap.get(modelKey)!;
                        const existing = brandMap.get(brand) || { model: model, count: 0 };
                        brandMap.set(brand, { model: model, count: existing.count + 1 });
                    }
                    
                    // Conteo para `indicator3`: Marcas de Bicis que usan el componente
                    if (bike.make) {
                         componentBikeMakes[category][bike.make] = (componentBikeMakes[category][bike.make] || 0) + 1;
                    }

                    // Poblar mapa para desglose de Marcas -> Modelos de forma agrupada e aislada
                    if (model) {
                        const brandMap = brandToModelsByCategory[category];
                        if (!brandMap.has(brand)) {
                            brandMap.set(brand, new Map());
                        }
                        const modelMap = brandMap.get(brand)!;
                        modelMap.set(model, (modelMap.get(model) || 0) + 1);
                    }
                });
            }
        });
        
        // --- Agregaciones Post-Bucle para Indicadores Complejos ---
        const drivetrainBikeCategories: Record<string, number> = {};
        const gripsBikeCategories: Record<string, number> = {};
        const suspensionComparison: Record<string, number> = { 'Rígida': 0, 'Suspensión': 0 };
        const shockComparison: Record<string, number> = { 'Rígida': 0, 'Doble Suspensión': 0 };

        snapshot.forEach(doc => {
            const bike = doc.data() as Bike;
            if (bike.status === 'inventory') return;
            const modalityLabel = BIKE_MODALITIES_OPTIONS.find(m => m.value === bike.modality)?.label || bike.modality || 'No especificada';

            if (bike.components?.drivetrain) drivetrainBikeCategories[modalityLabel] = (drivetrainBikeCategories[modalityLabel] || 0) + 1;
            if (bike.components?.grips) gripsBikeCategories[modalityLabel] = (gripsBikeCategories[modalityLabel] || 0) + 1;
            if (bike.components?.fork?.isNotApplicable) suspensionComparison['Rígida']++; else if (bike.components?.fork) suspensionComparison['Suspensión']++;
            if (bike.components?.shock?.isNotApplicable) shockComparison['Rígida']++; else if (bike.components?.shock) shockComparison['Doble Suspensión']++;
        });

        // --- Ensamblaje Final de Datos ---
        return {
            totalBikes,
            frameMaterial: {
                indicator1: buildChartData(frameMaterialCounts),
                indicator2: buildChartData(carbonBikeMakes),
                indicator3: buildChartData(aluminumBikeMakes)
            },
            brakes: {
                indicator1: buildChartData(componentBrandCounts.brakes, convertToBrandToModelsDetailedMap(brandToModelsByCategory.brakes)),
                indicator2: buildChartData(componentModelCounts.brakes, convertToModelToBrandsDetailedMap(modelToBrandsByCategory.brakes)),
                indicator3: buildChartData(componentBikeMakes.brakes),
            },
            drivetrain: {
                indicator1: buildChartData(componentBrandCounts.drivetrain, convertToBrandToModelsDetailedMap(brandToModelsByCategory.drivetrain)),
                indicator2: buildChartData(componentModelCounts.drivetrain, convertToModelToBrandsDetailedMap(modelToBrandsByCategory.drivetrain)),
                indicator3: buildChartData(drivetrainBikeCategories),
            },
            fork: {
                indicator1: buildChartData(componentBrandCounts.fork, convertToBrandToModelsDetailedMap(brandToModelsByCategory.fork)),
                indicator2: buildChartData(componentModelCounts.fork, convertToModelToBrandsDetailedMap(modelToBrandsByCategory.fork)),
                indicator3: buildChartData(suspensionComparison, undefined, 2),
            },
            shock: {
                indicator1: buildChartData(componentBrandCounts.shock, convertToBrandToModelsDetailedMap(brandToModelsByCategory.shock)),
                indicator2: buildChartData(componentModelCounts.shock, convertToModelToBrandsDetailedMap(modelToBrandsByCategory.shock)),
                indicator3: buildChartData(shockComparison, undefined, 2),
            },
            tires: {
                indicator1: buildChartData(componentBrandCounts.tires, convertToBrandToModelsDetailedMap(brandToModelsByCategory.tires)),
                indicator2: buildChartData(componentModelCounts.tires, convertToModelToBrandsDetailedMap(modelToBrandsByCategory.tires)),
                indicator3: buildChartData(componentBikeMakes.tires),
            },
            grips: {
                indicator1: buildChartData(componentBrandCounts.grips, convertToBrandToModelsDetailedMap(brandToModelsByCategory.grips)),
                indicator2: buildChartData(componentBrandCounts.grips), // Spec dice Top 5 marcas
                indicator3: buildChartData(gripsBikeCategories),
            },
            saddle: {
                indicator1: buildChartData(componentBrandCounts.saddle, convertToBrandToModelsDetailedMap(brandToModelsByCategory.saddle)),
                indicator2: buildChartData(componentBrandCounts.saddle), // Spec dice Top 5 marcas
                indicator3: buildChartData(componentBikeMakes.saddle),
            },
            pedals: {
                indicator1: buildChartData(componentBrandCounts.pedals, convertToBrandToModelsDetailedMap(brandToModelsByCategory.pedals)),
                indicator2: buildChartData(componentModelCounts.pedals, convertToModelToBrandsDetailedMap(modelToBrandsByCategory.pedals)),
                indicator3: buildChartData(componentBikeMakes.pedals),
            },
        };
    },
    ['component-analytics-cache'],
    { revalidate: 30, tags: ['analytics'] }
);

// --- FIN DE REFACTORIZACIÓN ---