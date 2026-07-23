import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Replace with your real Firebase Project configurations
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.includes('YOUR_') &&
    firebaseConfig.projectId &&
    !firebaseConfig.projectId.includes('YOUR_') &&
    firebaseConfig.storageBucket &&
    !firebaseConfig.storageBucket.includes('YOUR_')
  );
};

// Initialize Firebase services
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

let dbInstance: any = null;
let storageInstance: any = null;

if (isFirebaseConfigured()) {
  try {
    dbInstance = getFirestore(app);
  } catch (err) {
    console.warn('Firebase Firestore initialization failed, using mock/offline mode:', err);
  }

  try {
    storageInstance = getStorage(app);
  } catch (err) {
    console.warn('Firebase Storage initialization failed, using mock/offline mode:', err);
  }
} else {
  console.warn('[firebaseConfig] Placeholder API values detected. Skipping Firebase Firestore & Storage initialization.');
}

export const db = dbInstance;
export const storage = storageInstance;

export const logoutFirebase = async (): Promise<void> => {
  console.log('[logoutFirebase] Starting signout...');
  try {
    if (isFirebaseConfigured()) {
      await auth.signOut();
      console.log('[logoutFirebase] Signout completed successfully');
    } else {
      console.log('[logoutFirebase] Firebase not configured, skipping signout');
    }
  } catch (err) {
    console.error('Firebase signout error:', err);
  }
};

export default app;
