'use server';

import { adminDb as db } from '@/lib/firebase/server';
import { BikonDevice } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { Transaction, QueryDocumentSnapshot } from 'firebase-admin/firestore';

// Tipos para actions
type ActionResult = {
  success: boolean;
  message: string;
  data?: any;
};

/**
 * Genera un lote de códigos Bikon (Solo Admin)
 */
export async function generateBikonCodes(quantity: number): Promise<ActionResult> {
  if (quantity < 1 || quantity > 100) {
    return { success: false, message: 'Cantidad debe ser entre 1 y 100' };
  }

  try {
    const batch = db.batch();
    const devicesRef = db.collection('bikon_devices');
    const timestamp = Date.now().toString();
    const createdCodes: string[] = [];

    for (let i = 0; i < quantity; i++) {
      // Generar un serial único simple: BK-TIMESTAMP-RANDOM
      const uniqueSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const serialNumber = `BK-${timestamp.slice(-6)}-${uniqueSuffix}`;
      
      const newDeviceRef = devicesRef.doc(serialNumber);
      
      const newDevice: BikonDevice = {
        id: serialNumber,
        serialNumber: serialNumber,
        status: 'available',
        createdAt: new Date().toISOString(),
        batchId: timestamp,
      };

      batch.set(newDeviceRef, newDevice);
      createdCodes.push(serialNumber);
    }

    await batch.commit();
    revalidatePath('/admin/bikon'); 
    
    return { 
      success: true, 
      message: `${quantity} dispositivos generados exitosamente.`,
      data: { codes: createdCodes }
    };
  } catch (error) {
    console.error('Error generating Bikon codes:', error);
    return { success: false, message: 'Error al generar códigos.' };
  }
}

/**
 * Vincula un dispositivo Bikon a una bicicleta
 */
export async function linkBikonToBike(
  bikeId: string, 
  userId: string, 
  serialNumber: string
): Promise<ActionResult> {
  if (!bikeId || !userId || !serialNumber) {
    return { success: false, message: 'Datos incompletos' };
  }

  try {
    // Usamos runTransaction para asegurar consistencia
    await db.runTransaction(async (transaction: Transaction) => {
      // 1. Obtener referencias
      const deviceRef = db.collection('bikon_devices').doc(serialNumber);
      const bikeRef = db.collection('bikes').doc(bikeId);

      // 2. Leer documentos
      const deviceDoc = await transaction.get(deviceRef);
      const bikeDoc = await transaction.get(bikeRef);

      // 3. Validaciones
      if (!deviceDoc.exists) {
        throw new Error('El número de serie no es válido.');
      }
      
      const deviceData = deviceDoc.data() as BikonDevice;
      if (deviceData.status !== 'available') {
        throw new Error('Este dispositivo ya ha sido vinculado o no está disponible.');
      }

      if (!bikeDoc.exists) {
        throw new Error('La bicicleta no existe.');
      }

      const bikeData = bikeDoc.data();
      if (bikeData?.userId !== userId) {
        throw new Error('No tienes permiso para modificar esta bicicleta.');
      }
      
      if (bikeData?.bikonId) {
         throw new Error('Esta bicicleta ya tiene un dispositivo vinculado.');
      }

      // 4. Actualizaciones
      transaction.update(deviceRef, {
        status: 'assigned',
        assignedToBikeId: bikeId,
        assignedToUserId: userId,
        assignedAt: new Date().toISOString(),
      });

      transaction.update(bikeRef, {
        bikonId: serialNumber
      });
    });

    revalidatePath(`/dashboard/bikes/${bikeId}`);
    return { success: true, message: 'Dispositivo vinculado exitosamente.' };

  } catch (error: any) {
    console.error('Error linking Bikon:', error);
    return { success: false, message: error.message || 'Error interno al vincular dispositivo.' };
  }
}

/**
 * Obtiene lista de dispositivos paginada (Para Admin)
 */
export async function getBikonDevices(limitCount = 50) {
    try {
        const snapshot = await db.collection('bikon_devices')
            .orderBy('createdAt', 'desc')
            .limit(limitCount)
            .get();
        
        return snapshot.docs.map((doc: QueryDocumentSnapshot) => doc.data() as BikonDevice);
    } catch (error) {
        console.error('Error fetching devices:', error);
        return [];
    }
}
