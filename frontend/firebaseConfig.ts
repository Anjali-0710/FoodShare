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

// Initialize Firebase services
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

let dbInstance: any = null;
try {
  dbInstance = getFirestore(app);
} catch (err) {
  console.warn('Firebase Firestore initialization failed, using mock/offline mode:', err);
}

let storageInstance: any = null;
try {
  storageInstance = getStorage(app);
} catch (err) {
  console.warn('Firebase Storage initialization failed, using mock/offline mode:', err);
}

export const db = dbInstance;
export const storage = storageInstance;

export const logoutFirebase = async (): Promise<void> => {
  try {
    await auth.signOut();
  } catch (err) {
    console.error('Firebase signout error:', err);
  }
};

export default app;
