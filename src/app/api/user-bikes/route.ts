import { NextResponse } from 'next/server';
import { getBikes } from '@/lib/data';
import { getDecodedSession } from '@/lib/auth';

export async function GET(request: Request) {
    const session = await getDecodedSession();
    if (!session?.uid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const bikes = await getBikes(session.uid);
        return NextResponse.json(bikes);
    } catch (error) {
        console.error('Error fetching user bikes:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
