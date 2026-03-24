import { adminDb as db } from '@/lib/firebase/server';
import { unstable_cache } from 'next/cache';

/**
 * CA1: Origen de Datos Ético (Solo data real).
 * CA2: Anonimización (Nombre sin apellidos, Marca y Modelo).
 */
export const getRecentSocialProofMessages = unstable_cache(
  async (): Promise<string[]> => {
    try {
      const bikesSnapshot = await db
        .collection('bikes')
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();

      if (bikesSnapshot.empty) {
        return [];
      }

      const messagePromises = bikesSnapshot.docs.map(async (doc: any) => {
        const bikeData = doc.data();
        if (!bikeData.make || !bikeData.userId) return null;

        const userDoc = await db.collection('users').doc(bikeData.userId).get();
        if (!userDoc.exists) return null;
        
        const userData = userDoc.data();
        const fullName = userData?.displayName || userData?.name || 'Un ciclista';
        
        const firstName = fullName.split(' ')[0].trim();
        const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

        const brand = bikeData.make.charAt(0).toUpperCase() + bikeData.make.slice(1);
        const model = bikeData.model ? ` ${bikeData.model}` : '';
        const bikeName = `${brand}${model}`.trim();

        const location = bikeData.state || userData?.state || userData?.city;
        
        if (location) {
            const formattedLocation = location.charAt(0).toUpperCase() + location.slice(1);
            return `${capitalizedName} de ${formattedLocation}, acaba de crear el Pasaporte Digital para su ${bikeName} ⚡️`;
        } else {
            return `${capitalizedName} acaba de crear el Pasaporte Digital para su ${bikeName} ⚡️`;
        }
      });

      const resolvedMessages = await Promise.all(messagePromises);
      
      const validMessages = resolvedMessages
          .filter((msg: any): msg is string => msg !== null)
          .slice(0, 20);

      return validMessages;
    } catch (error) {
      console.error('❌ Error fetching social proof messages:', error);
      return [];
    }
  },
  ['social-proof-messages'],
  { revalidate: 3600 } 
);
