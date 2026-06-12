import 'server-only';
import { adminDb } from '../firebase/server';
import { Serial } from '../types';

export async function getSerialsByOngId(ongId: string): Promise<Serial[]> {
    if (!ongId) return [];
    try {
        const db = adminDb;
        const query = db.collection('serials').where('ongId', '==', ongId);
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Serial));
    } catch (error) {
        console.error("Error fetching serials by ONG ID:", error);
        return [];
    }
}

export async function getSerial(serialId: string): Promise<Serial | null> {
    if (!serialId) return null;
    try {
        const db = adminDb;
        const doc = await db.collection('serials').doc(serialId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() } as Serial;
    } catch (error) {
        console.error("Error fetching serial:", error);
        return null;
    }
}
