import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

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

export const logoutFirebase = async (): Promise<void> => {
  try {
    await auth.signOut();
  } catch (err) {
    console.error('Firebase signout error:', err);
  }
};

export default app;
