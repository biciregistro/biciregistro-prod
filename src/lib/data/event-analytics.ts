import { adminDb } from '@/lib/firebase/server';
import { unstable_cache } from 'next/cache';
import { EventRegistration, User, Bike } from '@/lib/types';

export interface EventAnalyticsData {
  general: {
    totalRegistrations: number;
    checkedInCount: number;
    attendanceRate: number;
    averageAge: number;
    genderDistribution: { name: string; value: number }[];
    userLocations: { name: string; value: number }[];
    ageRanges: { name: string; value: number }[];
    usersWithAge: number; // NUEVO CAMPO: Total de usuarios con edad registrada
  };
  market: {
    totalAssetValue: number;
    averageAssetValue: number;
    topBrands: { name: string; value: number }[];
    topModalities: { name: string; value: number }[];
  };
}

export const getEventAnalytics = unstable_cache(
  async (eventId: string): Promise<EventAnalyticsData | null> => {
    try {
      if (!eventId) return null;

      // 1. Obtener inscripciones
      const registrationsSnap = await adminDb
        .collection('event-registrations')
        .where('eventId', '==', eventId)
        .where('status', '==', 'confirmed')
        .get();

      if (registrationsSnap.empty) {
        return {
             general: { 
                 totalRegistrations: 0, checkedInCount: 0, attendanceRate: 0, 
                 averageAge: 0, genderDistribution: [], userLocations: [], ageRanges: [], usersWithAge: 0
             },
             market: { 
                 totalAssetValue: 0, averageAssetValue: 0, topBrands: [], topModalities: [] 
             }
        };
      }

      const registrations = registrationsSnap.docs.map(doc => doc.data() as EventRegistration);
      const userIds = Array.from(new Set(registrations.map(r => r.userId)));
      
      const bikeIds = registrations
        .filter(r => r.bikeId)
        .map(r => ({ userId: r.userId, bikeId: r.bikeId! }));

      // 2. Fetch Usuarios en lotes
      let users: User[] = [];
      for (let i = 0; i < userIds.length; i += 30) {
        const chunk = userIds.slice(i, i + 30);
        if (chunk.length === 0) continue;
        const userSnap = await adminDb.collection('users').where('id', 'in', chunk).get();
        userSnap.forEach(doc => users.push(doc.data() as User));
      }

      // 3. Fetch Bicicletas específicas del evento
      const bikes: Bike[] = [];
      
      // Optimizacion: Leer las bicicletas individualmente mediante un Promise.all controlado
      // dado que no podemos filtrar fácilmente por un array de objetos {userId, bikeId} en Firestore
      // y los bikeIds pueden pertenecer a diferentes usuarios.
      // Asumimos la colección raiz 'bikes' según la investigación.
      
      const bikePromises = bikeIds.map(async ({ bikeId }) => {
          const doc = await adminDb.collection('bikes').doc(bikeId).get();
          if (doc.exists) return doc.data() as Bike;
          return null;
      });
      
      const bikesResults = await Promise.all(bikePromises);
      bikesResults.forEach(b => { if(b) bikes.push(b); });

      // --- CÁLCULOS GENERALES ---
      const totalRegistrations = registrations.length;
      const checkedInCount = registrations.filter(r => r.checkedIn).length;
      const attendanceRate = totalRegistrations > 0 ? Math.round((checkedInCount / totalRegistrations) * 100) : 0;

      // Demografía
      const ages: number[] = [];
      const genderCounts: Record<string, number> = {};
      const locationCounts: Record<string, number> = {};
      const ageRangesCounts: Record<string, number> = {
          '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0
      };

      users.forEach(u => {
        // Gender
        const gender = u.gender ? (u.gender.charAt(0).toUpperCase() + u.gender.slice(1)) : 'No especificado';
        genderCounts[gender] = (genderCounts[gender] || 0) + 1;

        // Location
        const loc = u.city ? `${u.city}, ${u.state || ''}` : (u.state || 'Desconocido');
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;

        // Age
        if (u.birthDate) {
            const birthYear = new Date(u.birthDate).getFullYear();
            if (!isNaN(birthYear)) {
                const age = new Date().getFullYear() - birthYear;
                ages.push(age);
                
                if (age >= 18 && age <= 24) ageRangesCounts['18-24']++;
                else if (age >= 25 && age <= 34) ageRangesCounts['25-34']++;
                else if (age >= 35 && age <= 44) ageRangesCounts['35-44']++;
                else if (age >= 45 && age <= 54) ageRangesCounts['45-54']++;
                else if (age >= 55) ageRangesCounts['55+']++;
            }
        }
      });

      const averageAge = ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
      const usersWithAge = ages.length; // Cálculo correcto de usuarios con edad registrada

      const genderDistribution = Object.entries(genderCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      const userLocations = Object.entries(locationCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Top 10

      const ageRanges = Object.entries(ageRangesCounts)
        .map(([name, value]) => ({ name, value }));

      // --- CÁLCULOS DE MERCADO ---
      const totalAssetValue = bikes.reduce((acc, b) => acc + (b.appraisedValue || 0), 0);
      const averageAssetValue = bikes.length > 0 ? Math.round(totalAssetValue / bikes.length) : 0;

      const brandCounts: Record<string, number> = {};
      const modalityCounts: Record<string, number> = {};

      bikes.forEach(b => {
          const brand = b.make || 'Desconocida';
          brandCounts[brand] = (brandCounts[brand] || 0) + 1;

          const modality = b.modality || 'Desconocida';
          modalityCounts[modality] = (modalityCounts[modality] || 0) + 1;
      });

      const topBrands = Object.entries(brandCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      const topModalities = Object.entries(modalityCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      return {
        general: {
            totalRegistrations,
            checkedInCount,
            attendanceRate,
            averageAge,
            genderDistribution,
            userLocations,
            ageRanges,
            usersWithAge
        },
        market: {
            totalAssetValue,
            averageAssetValue,
            topBrands,
            topModalities
        }
      };

    } catch (error) {
      console.error("Error fetching event analytics:", error);
      return null;
    }
  },
  ['event-analytics-v1'], 
  { revalidate: 3600 } // 1 hora de caché
);
