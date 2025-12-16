
import { adminDb } from '@/lib/firebase/server';
import { Bike, User } from '@/lib/types';
import { unstable_cache } from 'next/cache';
import { FieldPath } from 'firebase-admin/firestore';

// Interface matching the needs of the UI components
export interface OngAnalyticsData {
  general: {
    totalUsers: number;
    totalBikes: number;
    averageAge: number;
    genderDistribution: Record<string, number>;
    userLocations: Record<string, number>;
    averageAgeByGender: { gender: string; average: number }[];
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

      // Step 1: Fetch all users belonging to the ONG
      const usersSnapshot = await adminDb.collection('users').where('communityId', '==', ongId).get();
      if (usersSnapshot.empty) return null; // No users, no data.
      
      const users = usersSnapshot.docs.map(doc => doc.data() as User);
      const userIds = usersSnapshot.docs.map(doc => doc.id);

      // Step 2: Fetch all bikes belonging to those users in chunks of 30
      let bikes: Bike[] = [];
      if (userIds.length > 0) {
          const bikePromises = [];
          for (let i = 0; i < userIds.length; i += 30) {
              const chunk = userIds.slice(i, i + 30);
              const query = adminDb.collection('bikes').where('userId', 'in', chunk).get();
              bikePromises.push(query);
          }
          const bikeSnapshots = await Promise.all(bikePromises);
          bikeSnapshots.forEach(snap => {
              snap.forEach(doc => {
                  bikes.push(doc.data() as Bike);
              });
          });
      }

      // --- General ---
      const totalUsers = users.length;
      
      const ages: number[] = [];
      const agesByGenderMap: Record<string, number[]> = {};
      const genderDistribution: Record<string, number> = {};
      const userLocations: Record<string, number> = {};

      users.forEach(u => {
          if (u.birthDate) {
              const birthYear = new Date(u.birthDate).getFullYear();
              if (!isNaN(birthYear)) {
                  const age = new Date().getFullYear() - birthYear;
                  if (age > 0) {
                      ages.push(age);
                      const gender = u.gender || 'No especificado';
                      if (!agesByGenderMap[gender]) agesByGenderMap[gender] = [];
                      agesByGenderMap[gender].push(age);
                  }
              }
          }
          const gender = u.gender || 'No especificado';
          genderDistribution[gender] = (genderDistribution[gender] || 0) + 1;
          const loc = u.city || u.state || 'Desconocida';
          userLocations[loc] = (userLocations[loc] || 0) + 1;
      });

      const averageAge = ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
      
      const averageAgeByGender = Object.entries(agesByGenderMap).map(([gender, agesList]) => ({
          gender,
          average: Math.round(agesList.reduce((a, b) => a + b, 0) / agesList.length)
      }));

      // --- Market ---
      const totalBikes = bikes.length;
      const assetValue = bikes.reduce((acc, b) => acc + (b.appraisedValue || 0), 0);
      const averageValue = totalBikes > 0 ? assetValue / totalBikes : 0;
      
      const topBrands = bikes.reduce((acc, b) => {
          const brand = b.make || 'Desconocida';
          acc[brand] = (acc[brand] || 0) + 1;
          return acc;
      }, {} as Record<string, number>);

      const modalities = bikes.reduce((acc, b) => {
          const mod = b.modality || 'Desconocida';
          acc[mod] = (acc[mod] || 0) + 1;
          return acc;
      }, {} as Record<string, number>);

      // --- Security ---
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
        general: { totalUsers, totalBikes, averageAge, genderDistribution, userLocations, averageAgeByGender },
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
  ['ong-analytics-v3'], // Updated Cache key
  { revalidate: 3600 }
);
