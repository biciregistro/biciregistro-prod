'use server';

import { logEmergencyAccess } from '@/lib/actions/emergency-actions';

// Simple wrapper API route handler for logEmergencyAccess
export async function POST(request: Request) {
  try {
    const { uuid, lat, lng } = await request.json();
    
    // Server action already handles finding the user and logging
    // Just need to pass data through
    const result = await logEmergencyAccess(uuid, {
      lat, 
      lng,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    if (result.success) {
      return Response.json({ success: true, data: result.user });
    } else {
      return Response.json({ success: false, error: result.error }, { status: 404 });
    }
  } catch (error) {
    console.error('Error logging emergency access:', error);
    return Response.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}
