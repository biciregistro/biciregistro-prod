import { NextResponse } from 'next/server';
import { isSerialNumberUnique } from '@/lib/data';
import { adminDb } from '@/lib/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { serialNumber } = await request.json();

    if (!serialNumber || typeof serialNumber !== 'string') {
      return NextResponse.json({ error: 'El número de serie es inválido.' }, { status: 400 });
    }

    // Increment global search counter (Fraud prevention metric)
    // We use fire-and-forget to avoid latency impact on the user check
    adminDb.collection('stats').doc('global').set({
        totalSearches: FieldValue.increment(1)
    }, { merge: true }).catch(err => console.error("Error updating stats:", err));

    const isUnique = await isSerialNumberUnique(serialNumber);

    return NextResponse.json({ isUnique });
  } catch (error) {
    console.error('Error checking serial number:', error);
    return NextResponse.json({ error: 'Ocurrió un error en el servidor.' }, { status: 500 });
  }
}
