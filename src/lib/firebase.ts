'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const isFirebaseConfigured =
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== '...'; // A simple check to see if it's not the default placeholder

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let firebaseError: Error | null = null;

if (isFirebaseConfigured) {
    try {
        app = getApps().length ? getApp() : initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Enable offline persistence if not in a server environment
        if (typeof window !== 'undefined') {
            enableIndexedDbPersistence(db)
            .catch((err) => {
                if (err.code == 'failed-precondition') {
                // This can happen if multiple tabs are open and is not a critical error.
                } else if (err.code == 'unimplemented') {
                console.warn("Firestore offline persistence is not available in this browser.");
                }
            });
        }
    } catch (error: any) {
        console.error("Firebase initialization error:", error);
        firebaseError = error;
        app = null;
        db = null;
        auth = null;
    }
} else if (typeof window !== 'undefined') {
    // Log a clear error message in the browser console
    console.error("Firebase config is missing or invalid. Please create and configure your .env file with your Firebase project credentials. See README.md for reference.");
}

export { db, auth, firebaseError };
