// lib/firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const isDev = process.env.NODE_ENV === 'development';

// In dev, export null stubs so imports don't break
// Real Firebase only initialises in production
if (!isDev) {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
}

const app = getApps()[0] ?? null;

export const db = !isDev && app ? getFirestore(app) : null;
export const auth = !isDev && app ? getAuth(app) : null;
export default app;