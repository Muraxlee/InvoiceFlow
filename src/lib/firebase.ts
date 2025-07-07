'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check for missing configuration
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error(
    "Firebase config is missing. Please create a .env file with your Firebase project credentials. See .env.example for reference."
  );
}

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);


// Enable offline persistence if not in a server environment
if (typeof window !== 'undefined') {
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
}

export { db, auth };
