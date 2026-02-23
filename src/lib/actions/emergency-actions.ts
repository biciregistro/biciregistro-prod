'use server';

import { adminDb as db } from '@/lib/firebase/server';
import { User } from '@/lib/types';
import { nanoid } from 'nanoid';

/**
 * Ensures the user has an emergency QR UUID. 
 * If not, generates one and saves it to the user's profile.
 * Returns the UUID.
 */
export async function getOrCreateEmergencyQr(userId: string): Promise<string> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    throw new Error('User not found');
  }

  const userData = userSnap.data();
  
  // If already has a UUID, return it
  if (userData?.emergencyQrUuid) {
    return userData.emergencyQrUuid;
  }

  // Generate new UUID using nanoid (URL safe)
  const newUuid = nanoid();
  
  // Save to user profile
  await userRef.update({
    emergencyQrUuid: newUuid,
    emergencyQrCreatedAt: new Date().toISOString()
  });

  return newUuid;
}

/**
 * Regenerates the emergency QR UUID for a user.
 * This invalidates the old QR code.
 */
export async function regenerateEmergencyQr(userId: string): Promise<string> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const userRef = db.collection('users').doc(userId);
  const newUuid = nanoid();

  await userRef.update({
    emergencyQrUuid: newUuid,
    emergencyQrUpdatedAt: new Date().toISOString()
  });

  return newUuid;
}

/**
 * Logs an access attempt to the emergency profile.
 * Sends email notification to the user.
 */
export async function logEmergencyAccess(
  uuid: string, 
  data: { 
    ip?: string; 
    userAgent?: string; 
    lat?: number; 
    lng?: number; 
  }
) {
  // 1. Find user by emergencyQrUuid
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('emergencyQrUuid', '==', uuid).limit(1).get();

  if (snapshot.empty) {
    return { success: false, error: 'Invalid QR Code' };
  }

  const userDoc = snapshot.docs[0];
  const userId = userDoc.id;
  const userData = userDoc.data() as User;

  // 2. Log access
  await db.collection('emergency_logs').add({
    userId,
    uuid, // The QR code used
    accessedAt: new Date().toISOString(),
    ip: data.ip || 'unknown',
    userAgent: data.userAgent || 'unknown',
    location: {
      lat: data.lat || null,
      lng: data.lng || null
    }
  });

  // 3. Send email notification (Simulated for now, should integrate with Resend)
  // In a real implementation, call sendEmergencyAlertEmail(userData.email, data);
  console.log(`[EMERGENCY ALERT] User ${userId} profile accessed from ${data.lat}, ${data.lng}`);

  return { 
    success: true, 
    user: {
      name: userData.name,
      lastName: userData.lastName,
      bloodType: userData.bloodType,
      allergies: userData.allergies,
      insuranceInfo: userData.insuranceInfo,
      emergencyContactName: userData.emergencyContactName,
      emergencyContactPhone: userData.emergencyContactPhone,
      photoUrl: userData.avatarUrl || userData.logoUrl
    }
  };
}
