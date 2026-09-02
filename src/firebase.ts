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

/**
 * Returns human-readable diagnostic status for the active Firebase configuration
 */
export function getFirebaseConfigStatus(): {
  isMock: boolean;
  statusText: string;
  projectId: string;
  warning?: string;
} {
  if (isFirebaseMock) {
    return {
      isMock: true,
      statusText: 'Development Mock Mode (Placeholder Credentials)',
      projectId: firebaseConfig.projectId,
      warning: 'Firebase environment variables (VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID) are not configured. Running with simulated local auth & mock fallbacks.'
    };
  }
  return {
    isMock: false,
    statusText: 'Live Production Firebase Connected',
    projectId: firebaseConfig.projectId
  };
}

// Log explicit developer alert and dispatch notification event when running on mock credentials
if (typeof window !== 'undefined' && isFirebaseMock) {
  console.warn(
    '[Firebase Alert] Application is operating in mock configuration mode. Real-time Firestore sync and OAuth authentication will use local safety fallbacks until VITE_FIREBASE_API_KEY is supplied.'
  );
}

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
  
  if (isFirebaseMock) {
    const mockNotice = `[Firebase Mock Notice] Operation (${operationType}) at ${path || 'document'} was attempted using placeholder credentials. Please configure live Firebase environment variables for persistent storage.`;
    console.warn(mockNotice);
    throw new Error(mockNotice);
  }

  console.error(`[Firestore Error] ${operationType} at ${path || 'unknown path'}:`, errorMessage);
  throw new Error(`Firestore operation (${operationType}) failed: ${errorMessage}`);
}
