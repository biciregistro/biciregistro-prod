import { adminDb } from '@/lib/firebase/server';
import { Bike, User } from '@/lib/types';
import { unstable_cache } from 'next/cache';
import { getGenerationId } from '@/lib/constants/generations';

// Interface matching the needs of the UI components
export interface OngAnalyticsData {
  general: {
    totalUsers: number;
    totalBikes: number;
    averageAge: number;
    genderDistribution: Record<string, number>;
    userLocations: Record<string, number>;
    averageAgeByGender: { gender: string; average: number }[];
    generationsDistribution: Record<string, number>; // NEW
  };
  market: {
    assetValue: number;
    averageValue: number;
    topBrands: Record<string, number>;
    modalities: Record<string, number>;
  };
  security: {
    counts: { safe: number; stolen: number; recovered: number; };
    ecosystemHealth: number;
    topStolenBrands: Record<string, number>;
    theftsByModality: Record<string, number>;
    topTheftLocations: Record<string, number>;
  };
}

export const getOngAnalytics = unstable_cache(
  async (ongId: string): Promise<OngAnalyticsData | null> => {
    try {
      if (!ongId) throw new Error('ONG ID is required.');

      const userIds = new Set<string>();

      // 1. Resolver Identidades: Directos + Eventos (El mismo motor de Comunidad)
      // Directos
      const directUsersSnapshot = await adminDb.collection('users')
          .where('communityId', '==', ongId)
          .select() 
          .get();
      directUsersSnapshot.forEach(doc => userIds.add(doc.id));

      // Eventos
      const eventsSnapshot = await adminDb.collection('events').where('ongId', '==', ongId).get();
      const eventIds = eventsSnapshot.docs.map(e => e.id);

      if (eventIds.length > 0) {
           for (let i = 0; i < eventIds.length; i += 10) {
               const chunk = eventIds.slice(i, i + 10);
               const registrationsSnapshot = await adminDb.collection('event-registrations')
                  .where('eventId', 'in', chunk)
                  .select('userId')
                  .get();
               registrationsSnapshot.forEach(doc => {
                   const data = doc.data();
                   if (data.userId) userIds.add(data.userId);
               });
           }
      }

      const userIdsArray = Array.from(userIds);
      
      if (userIdsArray.length === 0) return null; // No hay comunidad

      // 2. Fetch Carga Masiva: Usuarios
      let users: User[] = [];
      for (let i = 0; i < userIdsArray.length; i += 30) {
          const chunk = userIdsArray.slice(i, i + 30);
          const usersSnap = await adminDb.collection('users').where('id', 'in', chunk).get();
          usersSnap.forEach(doc => users.push(doc.data() as User));
      }

      // 3. Fetch Carga Masiva: Bicicletas
      let bikes: Bike[] = [];
      for (let i = 0; i < userIdsArray.length; i += 30) {
          const chunk = userIdsArray.slice(i, i + 30);
          const bikesSnap = await adminDb.collection('bikes').where('userId', 'in', chunk).get();
          bikesSnap.forEach(doc => bikes.push(doc.data() as Bike));
      }

      // --- CÁLCULOS: General ---
      const totalUsers = users.length;
      
      const ages: number[] = [];
      const agesByGenderMap: Record<string, number[]> = {};
      const genderDistribution: Record<string, number> = {};
      const userLocations: Record<string, number> = {};
      const generationsDistribution: Record<string, number> = {
          'gen_z': 0, 'millennials': 0, 'gen_x': 0, 'boomers': 0
      };

      users.forEach(u => {
          if (u.birthDate) {
              const birthYear = new Date(u.birthDate).getFullYear();
              if (!isNaN(birthYear)) {
                  const age = new Date().getFullYear() - birthYear;
                  if (age > 0) {
                      ages.push(age);
                      const gender = u.gender ? (u.gender.charAt(0).toUpperCase() + u.gender.slice(1)) : 'No especificado';
                      if (!agesByGenderMap[gender]) agesByGenderMap[gender] = [];
                      agesByGenderMap[gender].push(age);
                      
                      const genId = getGenerationId(u.birthDate);
                      if (genId !== 'unknown') {
                          generationsDistribution[genId]++;
                      }
                  }
              }
          }
          const gender = u.gender ? (u.gender.charAt(0).toUpperCase() + u.gender.slice(1)) : 'No especificado';
          genderDistribution[gender] = (genderDistribution[gender] || 0) + 1;
          
          // --- NUEVA LÓGICA DE UBICACIONES TOP 5 (Estado, Ciudad) ---
          if (u.state && u.city) {
              const locKey = `${u.city}, ${u.state}`;
              userLocations[locKey] = (userLocations[locKey] || 0) + 1;
          } else if (u.state || u.city) {
              const locKey = u.city || u.state || 'Desconocida';
              userLocations[locKey] = (userLocations[locKey] || 0) + 1;
          } else {
              userLocations['Desconocida'] = (userLocations['Desconocida'] || 0) + 1;
          }
      });

      // Recortar a Top 5 Ubicaciones para evitar listas largas en la UI
      const sortedLocations = Object.entries(userLocations)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5);
      
      const topUserLocations = Object.fromEntries(sortedLocations);

      const averageAge = ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
      
      const averageAgeByGender = Object.entries(agesByGenderMap).map(([gender, agesList]) => ({
          gender,
          average: Math.round(agesList.reduce((a, b) => a + b, 0) / agesList.length)
      }));

      // --- CÁLCULOS: Market ---
      const totalBikes = bikes.length;
      const assetValue = bikes.reduce((acc, b) => acc + (b.appraisedValue || 0), 0);
      const averageValue = totalBikes > 0 ? assetValue / totalBikes : 0;
      
      const brandsMap = bikes.reduce((acc, b) => {
          const brand = b.make || 'Desconocida';
          acc[brand] = (acc[brand] || 0) + 1;
          return acc;
      }, {} as Record<string, number>);

      // Recortar a Top 10 Marcas
      const topBrands = Object.fromEntries(
          Object.entries(brandsMap)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10)
      );

      const modalitiesMap = bikes.reduce((acc, b) => {
          const mod = b.modality || 'Desconocida';
          acc[mod] = (acc[mod] || 0) + 1;
          return acc;
      }, {} as Record<string, number>);

      // Ordenar modalidades y calcular porcentajes
      const modalities = Object.fromEntries(
          Object.entries(modalitiesMap)
              .sort(([, a], [, b]) => b - a)
      );

      // --- CÁLCULOS: Security ---
      const stolenBikes = bikes.filter(b => b.status === 'stolen');
      const recoveredBikes = bikes.filter(b => b.status === 'recovered');
      const safeBikes = totalBikes - stolenBikes.length - recoveredBikes.length;

      const ecosystemHealth = totalBikes > 0 
        ? Math.round(((totalBikes - stolenBikes.length) / totalBikes) * 100) 
        : 100;

      const topStolenBrands = stolenBikes.reduce((acc, b) => {
          const brand = b.make || 'Desconocida';
          acc[brand] = (acc[brand] || 0) + 1;
          return acc;
      }, {} as Record<string, number>);

      const theftsByModality = stolenBikes.reduce((acc, b) => {
          const mod = b.modality || 'Desconocida';
          acc[mod] = (acc[mod] || 0) + 1;
          return acc;
      }, {} as Record<string, number>);

      const topTheftLocations = stolenBikes.reduce((acc, b) => {
          const loc = b.theftReport?.city || b.theftReport?.location || 'Desconocida';
          acc[loc] = (acc[loc] || 0) + 1;
          return acc;
      }, {} as Record<string, number>);

      return {
        general: { 
            totalUsers, totalBikes, averageAge, genderDistribution, userLocations: topUserLocations, 
            averageAgeByGender, generationsDistribution 
        },
        market: { assetValue, averageValue, topBrands, modalities },
        security: { 
            counts: { safe: safeBikes, stolen: stolenBikes.length, recovered: recoveredBikes.length },
            ecosystemHealth, 
            topStolenBrands, 
            theftsByModality, 
            topTheftLocations 
        }
      };

    } catch (error) {
      console.error("Error fetching ONG analytics:", error);
      return null;
    }
  },
  ['ong-analytics-v7'], // Caché actualizado
  { revalidate: 3600 }
);