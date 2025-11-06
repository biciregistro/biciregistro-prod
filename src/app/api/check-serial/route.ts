
import { NextResponse } from 'next/server';
import { isSerialNumberUnique } from '@/lib/data';

export async function POST(request: Request) {
  try {
    const { serialNumber } = await request.json();

    if (!serialNumber || typeof serialNumber !== 'string') {
      return NextResponse.json({ error: 'El número de serie es inválido.' }, { status: 400 });
    }

    const isUnique = await isSerialNumberUnique(serialNumber);

    return NextResponse.json({ isUnique });
  } catch (error) {
    console.error('Error checking serial number:', error);
    return NextResponse.json({ error: 'Ocurrió un error en el servidor.' }, { status: 500 });
  }
}
