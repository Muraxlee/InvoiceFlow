
'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// Extend the Window interface to include our custom flag
declare global {
  interface Window {
    _firebaseEmulatorConnected?: boolean;
  }
}

// Use environment variables, but provide mock values for emulator-first development.
// This allows the app to run without a .env file when using emulators.
// For production, these variables MUST be set.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "mock-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-invoiceflow",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Connect to Firebase Emulators in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Check if we've already connected to the emulator
  if (!window._firebaseEmulatorConnected) {
    console.log("Connecting to Firebase Emulators on new ports...");
    try {
      connectFirestoreEmulator(db, '127.0.0.1', 8288);
      connectAuthEmulator(auth, 'http://127.0.0.1:9299');
      console.log("Successfully connected to Firestore and Auth Emulators.");
      // Set a flag to prevent re-connecting on hot reloads
      window._firebaseEmulatorConnected = true;
    } catch (error) {
      console.error("Error connecting to Firebase Emulators:", error);
    }
  }
}

// Enable offline persistence
try {
  enableIndexedDbPersistence(db)
    .then(() => console.log("Firestore offline persistence enabled."))
    .catch((err) => {
      if (err.code == 'failed-precondition') {
        console.warn("Firestore offline persistence could not be enabled: multiple tabs open.");
      } else if (err.code == 'unimplemented') {
        console.warn("Firestore offline persistence is not available in this browser.");
      }
    });
} catch(error) {
  console.error("Error enabling offline persistence:", error)
}


export { db, auth };
