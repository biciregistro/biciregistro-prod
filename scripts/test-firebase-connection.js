
const { adminAuth, adminDb } = require('./src/lib/firebase/server');

async function testFirebase() {
  console.log("Testing Firebase Admin SDK...");
  try {
    // List users to test Auth
    const listUsersResult = await adminAuth.listUsers(1);
    console.log("Auth connected. User count:", listUsersResult.users.length);

    // List collections to test Firestore
    const collections = await adminDb.listCollections();
    console.log("Firestore connected. Collections:", collections.map(c => c.id).join(', '));

    console.log("SUCCESS: Firebase Admin SDK is working.");
  } catch (error) {
    console.error("FAILURE: Firebase Admin SDK error:", error);
  }
}

testFirebase();
