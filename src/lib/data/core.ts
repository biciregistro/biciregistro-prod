import 'server-only';
import { adminDb, adminAuth } from '../firebase/server';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type { User, Event, Bike, UserRole } from '../types';
import { UserRecord } from 'firebase-admin/auth';
import { getDecodedSession } from '@/lib/auth';

// --- Helper Functions ---

const normalizeSerialNumber = (serial: string): string => {
    return serial.replace(/[\s-]+/g, '').toUpperCase();
};

const convertBikeTimestamps = (data: any): any => {
    if (!data) return data;
    const convertedData = { ...data };
    if (convertedData.createdAt instanceof Timestamp) {
        convertedData.createdAt = convertedData.createdAt.toDate().toISOString();
    }
    if (convertedData.theftReport?.date instanceof Timestamp) {
        convertedData.theftReport.date = convertedData.theftReport.date.toDate().toISOString();
    }
    return convertedData;
};

const convertEventTimestamps = (data: any): any => {
    if (!data) return data;
    const convertedData = { ...data };
    if (convertedData.date instanceof Timestamp) {
        convertedData.date = convertedData.date.toDate().toISOString();
    }
    return convertedData;
};

const formatUserRecord = (userRecord: UserRecord): User => {
    const isAdmin = userRecord.customClaims?.admin === true;
    const displayName = userRecord.displayName || "";
    const nameParts = displayName.split(" ");
    const name = nameParts.shift() || userRecord.email?.split("@")[0] || "N/A";
    const lastName = nameParts.join(" ");

    return {
        id: userRecord.uid,
        email: userRecord.email || "No email",
        name,
        lastName,
        role: isAdmin ? "admin" : "ciclista",
    };
};

// --- Core Data Access Functions ---

export async function getUser(userId: string): Promise<User | null> {
    if (!userId) return null;
    try {
        const db = adminDb;
        const docSnap = await db.collection('users').doc(userId).get();
        return docSnap.exists ? { id: docSnap.id, ...docSnap.data() } as User : null;
    } catch (error) {
        console.error("Error fetching user:", error);
        return null;
    }
}

export async function getEvent(eventId: string): Promise<Event | null> {
    if (!eventId) return null;
    try {
        const db = adminDb;
        const docSnap = await db.collection('events').doc(eventId).get();
        if (!docSnap.exists) {
            return null;
        }
        return { id: docSnap.id, ...convertEventTimestamps(docSnap.data()) } as Event;
    } catch (error) {
        console.error("Error fetching event:", error);
        return null;
    }
}

export async function getBike(userId: string, bikeId: string): Promise<Bike | null> {
    if (!userId || !bikeId) return null;
    try {
        const db = adminDb;
        const docSnap = await db.collection('bikes').doc(bikeId).get();

        if (!docSnap.exists) {
            return null;
        }

        const bikeData = docSnap.data() as Bike;

        if (bikeData.userId !== userId) {
            console.warn(`Security warning: User ${userId} attempted to access bike ${bikeId} owned by ${bikeData.userId}.`);
            return null;
        }

        return { id: docSnap.id, ...convertBikeTimestamps(bikeData) } as Bike;
    } catch (error) {
        console.error("Error fetching bike:", error);
        return null;
    }
}

// Re-export other helpers if needed by data.ts but not causing cycles
export { convertBikeTimestamps, convertEventTimestamps, normalizeSerialNumber, formatUserRecord };
