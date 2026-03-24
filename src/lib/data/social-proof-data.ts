import { adminDb as db } from '@/lib/firebase/server';
import { unstable_cache } from 'next/cache';

/**
 * CA1: Origen de Datos Ético (Solo data real).
 * CA2: Anonimización (Nombre sin apellidos, Marca y Modelo).
 * 
 * Obtiene las últimas bicicletas registradas y sus dueños para
 * generar notificaciones de prueba social 100% reales rotando
 * entre 3 plantillas distintas para mayor dinamismo.
 */
export const getRecentSocialProofMessages = unstable_cache(
  async (): Promise<string[]> => {
    try {
      // Pedimos 100 para tener un buen margen de filtrado, luego cortaremos a 20.
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
        
        // Regla de seguridad: Si no hay marca (make) o dueño, se descarta.
        if (!bikeData.make || !bikeData.userId) {
          return null;
        }

        // 1. Obtener datos del usuario para el Nombre
        const userDoc = await db.collection('users').doc(bikeData.userId).get();
        if (!userDoc.exists) {
          return null;
        }
        
        const userData = userDoc.data();
        const fullName = userData?.displayName || userData?.name || 'Un ciclista';
        
        // Anonimización: Solo el primer nombre (cortamos en el primer espacio)
        const firstName = fullName.split(' ')[0].trim();
        const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

        // 2. Formatear datos de la Bicicleta
        const brand = bikeData.make.charAt(0).toUpperCase() + bikeData.make.slice(1);
        const model = bikeData.model ? ` ${bikeData.model}` : '';
        const bikeName = `${brand}${model}`.trim();

        // 3. Formatear la Ubicación (Estado/Ciudad)
        const location = bikeData.state || userData?.state || userData?.city;
        const formattedLocation = location ? location.charAt(0).toUpperCase() + location.slice(1) : null;
        
        // 4. Construir la Plantilla Aleatoria
        const templates = [];

        if (formattedLocation) {
          templates.push(
            `${capitalizedName} de ${formattedLocation}, acaba de crear el Pasaporte Digital para su ${bikeName} ⚡️`,
            `${capitalizedName} de ${formattedLocation} acaba de ganar 300 Kilómetros. ⚡`,
            `${capitalizedName} se acaba de unir a Biciregistro desde ${formattedLocation} 🛡️` // Shield icon
          );
        } else {
          // Fallback en caso de que ni la bici ni el usuario tengan ubicación
          templates.push(
            `${capitalizedName} acaba de crear el Pasaporte Digital para su ${bikeName} ⚡️`,
            `${capitalizedName} acaba de ganar 300 Kilómetros. ⚡`,
            `${capitalizedName} se acaba de unir a Biciregistro 🛡️`
          );
        }

        // Elegir una plantilla aleatoria para esta notificación
        const randomIndex = Math.floor(Math.random() * templates.length);
        return templates[randomIndex];
      });

      const resolvedMessages = await Promise.all(messagePromises);
      
      // Filtramos los nulos y tomamos estrictamente un máximo de 20 mensajes válidos
      const validMessages = resolvedMessages
          .filter((msg: any): msg is string => msg !== null)
          .slice(0, 20);

      // Mezclar (Shuffle) el array resultante para que no siempre salgan en el mismo orden
      // de fecha de creación, aumentando el efecto orgánico.
      for (let i = validMessages.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [validMessages[i], validMessages[j]] = [validMessages[j], validMessages[i]];
      }

      return validMessages;
    } catch (error) {
      console.error('❌ Error fetching social proof messages:', error);
      return [];
    }
  },
  ['social-proof-messages-v3'],
  { revalidate: 3600 } // Caché por 1 hora
);