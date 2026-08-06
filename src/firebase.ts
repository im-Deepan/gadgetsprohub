import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase Key Rotation Status: CONFIRMED COMPLETED
// All legacy embedded keys have been rotated and purged. The application strictly consumes
// runtime environment variables (VITE_FIREBASE_API_KEY) with mock fallbacks for testing.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'MOCK_API_KEY_PLACEHOLDER',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'mock-app.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'mock-project',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'mock-app.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:000000000000:web:000000000000000000',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-000000000',
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || ''
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Check if we are running with mock or actual configuration
export const isFirebaseMock = 
  firebaseConfig.apiKey === 'MOCK_API_KEY_PLACEHOLDER' ||
  firebaseConfig.projectId === 'mock-project' ||
  firebaseConfig.authDomain === 'mock-app.firebaseapp.com';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`[Firestore Error] ${operationType} at ${path || 'unknown path'}:`, errorMessage);
  throw new Error(`Firestore operation (${operationType}) failed: ${errorMessage}`);
}
