import { adminDb } from '../firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Service to manage the atomic assignment of bib numbers (placas)
 * for a global Serial/Campeonato.
 */
export class SerialBibService {
  /**
   * Retrieves the existing serial bib number for a user, or generates a new one safely.
   * 
   * @param serialId The ID of the Serial (Wrapper)
   * @param userId The ID of the user requesting a bib number
   * @param startNumber (Optional) The initial number to start counting from if the counter doesn't exist. Defaults to 1.
   * @returns A promise that resolves to the generated or retrieved bib number.
   * @throws Error if any database operation fails.
   */
  static async getOrGenerateSerialBibNumber(serialId: string, userId: string, startNumber: number = 1): Promise<number> {
    const registrationRef = adminDb.collection('serial_registrations').doc(`${serialId}_${userId}`);
    const counterRef = adminDb.collection('serial_bib_counters').doc(serialId);

    // 1. Check if the user already has a bib number for this serial
    const registrationDoc = await registrationRef.get();
    
    if (registrationDoc.exists) {
      const data = registrationDoc.data();
      if (data && typeof data.bibNumber === 'number') {
        return data.bibNumber;
      }
    }

    // 2. If not, generate a new one atomically using a transaction to ensure uniqueness
    // We use a transaction because we need to read the counter, increment it, and save the registration
    // to prevent race conditions if the same user tries to register twice simultaneously,
    // though FieldValue.increment() is also atomic on its own.
    
    return await adminDb.runTransaction(async (transaction) => {
       // Check registration again inside transaction to prevent race conditions
       const txRegistrationDoc = await transaction.get(registrationRef);
       if (txRegistrationDoc.exists) {
         const data = txRegistrationDoc.data();
         if (data && typeof data.bibNumber === 'number') {
           return data.bibNumber;
         }
       }

       const counterDoc = await transaction.get(counterRef);
       let nextBib = startNumber;

       if (counterDoc.exists) {
           const currentCount = counterDoc.data()?.currentNumber || (startNumber - 1);
           nextBib = currentCount + 1;
           transaction.update(counterRef, { currentNumber: FieldValue.increment(1) });
       } else {
           // Initialize counter
           transaction.set(counterRef, { currentNumber: nextBib });
       }

       // Save the relation so we don't generate another one for this user
       transaction.set(registrationRef, {
           userId,
           serialId,
           bibNumber: nextBib,
           assignedAt: new Date().toISOString()
       });

       return nextBib;
    });
  }
}
