'use server';
import { getDecodedSession } from '@/lib/auth/server';
import { recordUniqueAction } from './gamification-actions';

export async function recordDownloadAction(type: 'sticker' | 'qr') {
    const session = await getDecodedSession();
    if (!session?.uid) return;

    const actionId = type === 'sticker' ? 'download_sticker_pdf' : 'download_emergency_qr';
    await recordUniqueAction(session.uid, actionId);
}
