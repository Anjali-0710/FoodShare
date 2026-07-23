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

// Initialize Firebase services conditionally only when real credentials are present
let appInstance: any = null;
let authInstance: any = null;
let dbInstance: any = null;
let storageInstance: any = null;

if (isFirebaseConfigured()) {
  try {
    appInstance = initializeApp(firebaseConfig);
    authInstance = getAuth(appInstance);
    dbInstance = getFirestore(appInstance);
    storageInstance = getStorage(appInstance);
  } catch (err) {
    // Non-fatal fallback for unconfigured environments
  }
}

export const app = appInstance;
export const auth = authInstance;
export const db = dbInstance;
export const storage = storageInstance;

export const logoutFirebase = async (): Promise<void> => {
  try {
    if (isFirebaseConfigured() && authInstance) {
      await authInstance.signOut();
    }
  } catch (err) {
    // Silent error handling
  }
};

export default app;
