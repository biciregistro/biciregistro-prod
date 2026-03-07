'use server';

import { adminDb as db } from '@/lib/firebase/server';
import { InsuranceRequest, InsuranceStatus } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser as getCurrentUser } from '@/lib/data';
import { awardPoints, recordUniqueAction } from '@/lib/actions/gamification-actions'; // Importar gamificación

const COLLECTION = 'insurance_requests';

// --- Actions for User (Ciclista) ---

export async function createInsuranceRequest(
  bikeId: string,
  userPhone: string,
  userEmail: string,
  bikeInfo: { brand: string; model: string; color: string; year: string }
) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const userName = `${user.name} ${user.lastName || ''}`.trim();
  
  // Prioridad: 1. Teléfono pasado por el form, 2. Teléfono en perfil, 3. WhatsApp en perfil
  const finalUserPhone = userPhone || user.phone || user.whatsapp || '';

  // Check if a request already exists for this bike
  const existingSnapshot = await db.collection(COLLECTION).where('bikeId', '==', bikeId).get();
  
  if (!existingSnapshot.empty) {
    const doc = existingSnapshot.docs[0];
    const data = doc.data() as InsuranceRequest;
    
    if (['REJECTED', 'CLOSED'].includes(data.status)) {
         await doc.ref.update({
            status: 'PENDING',
            userName,
            userPhone: finalUserPhone,
            userEmail,
            bikeInfo,
            updatedAt: new Date().toISOString(),
            premium: 0,
            commission: 0,
            paymentLink: '',
            quoteUrl: '',
            policyUrl: ''
        });
        revalidatePath(`/dashboard/bikes/${bikeId}`);
        return { success: true, id: doc.id };
    } else {
        return { success: false, message: 'Ya existe una solicitud activa para esta bicicleta.' };
    }
  }

  const newRequest: Omit<InsuranceRequest, 'id'> = {
    bikeId,
    userId: user.id, 
    userName,
    userPhone: finalUserPhone,
    userEmail,
    bikeInfo,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const ref = await db.collection(COLLECTION).add(newRequest);
  
  revalidatePath(`/dashboard/bikes/${bikeId}`);
  return { success: true, id: ref.id };
}

export async function approveQuote(requestId: string) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    await db.collection(COLLECTION).doc(requestId).update({
        status: 'APPROVED',
        updatedAt: new Date().toISOString()
    });
    
    const doc = await db.collection(COLLECTION).doc(requestId).get();
    if (doc.exists) {
        const data = doc.data() as InsuranceRequest;
        revalidatePath(`/dashboard/bikes/${data.bikeId}`);
    }
    
    return { success: true };
}

export async function rejectQuote(requestId: string) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    await db.collection(COLLECTION).doc(requestId).update({
        status: 'REJECTED',
        updatedAt: new Date().toISOString()
    });
     const doc = await db.collection(COLLECTION).doc(requestId).get();
    if (doc.exists) {
        const data = doc.data() as InsuranceRequest;
        revalidatePath(`/dashboard/bikes/${data.bikeId}`);
    }
    return { success: true };
}

export async function uploadPolicyUrl(requestId: string, url: string) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');
    
    const docRef = db.collection(COLLECTION).doc(requestId);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) throw new Error('Request not found');
    const data = docSnap.data() as InsuranceRequest;

    await docRef.update({
        policyUrl: url,
        updatedAt: new Date().toISOString()
    });

    // GAMIFICACIÓN: Intentar otorgar puntos si no se han dado antes
    const pointsResult = await recordUniqueAction(user.id, 'insurance_purchase', { requestId, bikeId: data.bikeId });

    revalidatePath(`/dashboard/bikes/${data.bikeId}`);
    
    // Type-safe extraction of points
    const points = (pointsResult && pointsResult.success && 'points' in pointsResult) ? (pointsResult as any).points : 0;

    return { success: true, pointsAwarded: points };
}

// --- Actions for Admin ---

export async function getAllInsuranceRequests() {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') throw new Error('Unauthorized');

    const snapshot = await db.collection(COLLECTION).orderBy('updatedAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InsuranceRequest));
}

export async function updateQuoteDetails(
    requestId: string, 
    data: { 
        premium: number; 
        commission: number; 
        policyValidity: string; 
        status?: InsuranceStatus;
        quoteUrl?: string;
    }
) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') throw new Error('Unauthorized');

    const docRef = db.collection(COLLECTION).doc(requestId);
    const prevSnap = await docRef.get();
    const prevData = prevSnap.data() as InsuranceRequest;

    await docRef.update({
        ...data,
        updatedAt: new Date().toISOString()
    });
    
    // GAMIFICACIÓN: Si se actualiza el status a PAID (Pagado/Activo) desde aquí
    if (data.status === 'PAID' && prevData.status !== 'PAID') {
         await recordUniqueAction(prevData.userId, 'insurance_purchase', { requestId, bikeId: prevData.bikeId });
    }

    revalidatePath('/admin'); // Revalidar la ruta principal del admin
    return { success: true };
}

export async function updateInsuranceStatus(requestId: string, status: InsuranceStatus) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') throw new Error('Unauthorized');

    const docRef = db.collection(COLLECTION).doc(requestId);
    const prevSnap = await docRef.get();
    const prevData = prevSnap.data() as InsuranceRequest;

    await docRef.update({
        status,
        updatedAt: new Date().toISOString()
    });

    // GAMIFICACIÓN: Puntos por seguro pagado
    if (status === 'PAID' && prevData.status !== 'PAID') {
         await recordUniqueAction(prevData.userId, 'insurance_purchase', { requestId, bikeId: prevData.bikeId });
    }

    revalidatePath('/admin'); // Revalidar la ruta principal del admin
    return { success: true };
}

// --- Getters ---

export async function getInsuranceRequestByBikeId(bikeId: string) {
    const user = await getCurrentUser();
    if (!user) return null;

    const snapshot = await db.collection(COLLECTION).where('bikeId', '==', bikeId).get();
    if (snapshot.empty) return null;

    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as InsuranceRequest;
}
