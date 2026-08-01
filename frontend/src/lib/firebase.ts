/**
 * Firebase Client Configuration
 * Initialize Firebase Auth for the frontend
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Prevent re-initialization during hot reloads
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Use browserLocalPersistence to avoid "Database is closing" IndexedDB
// errors caused by Turbopack HMR tearing down connections mid-operation
setPersistence(auth, browserLocalPersistence).catch(() => {
  // Silently ignore — happens during fast HMR reloads in dev
});

export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

export default app;
