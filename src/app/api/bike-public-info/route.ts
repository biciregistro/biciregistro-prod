import { NextResponse } from 'next/server';
import { getBikeBySerial } from '@/lib/data';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const serial = searchParams.get('serial');

    if (!serial) {
        return NextResponse.json({ error: 'Falta número de serie' }, { status: 400 });
    }

    try {
        const bike = await getBikeBySerial(serial);

        if (!bike) {
            return NextResponse.json({ found: false });
        }

        // Devolver solo info pública para el widget
        return NextResponse.json({
            found: true,
            status: bike.status,
            brand: bike.make,
            model: bike.model,
            color: bike.color,
            date: bike.theftReport?.date || null,
        });

    } catch (error) {
        console.error('Error in bike-public-info API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
