import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Note: Ensure your real Firebase credentials are in a .env.local file
// VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, etc.
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
export const isFirebaseMock = firebaseConfig.apiKey === 'MOCK_API_KEY_PLACEHOLDER';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  throw new Error(JSON.stringify(errInfo));
}
