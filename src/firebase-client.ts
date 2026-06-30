/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signInAnonymously } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const dbId = (firebaseConfig as any).firestoreDatabaseId;
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
}, (dbId && dbId !== '(default)') ? dbId : undefined);

export const ensureFirebaseAuth = async (): Promise<void> => {
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (err) {
      // Log as a warning rather than a fatal error since security rules allow unauthenticated fallback
      console.warn("Firebase anonymous authentication is disabled on this project. Falling back to unauthenticated database access.");
    }
  }
};

const provider = new GoogleAuthProvider();
// Request Google Meet scopes for team meetings
provider.addScope('https://www.googleapis.com/auth/meetings.space.created');
provider.addScope('https://www.googleapis.com/auth/meetings.space.readonly');
provider.addScope('https://www.googleapis.com/auth/meetings.space.settings');

// Keep auth states and cache the access token in memory (never localStorage!)
let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedGoogleUser: User | null = null;

// Listeners list
const listeners: ((user: User | null, token: string | null) => void)[] = [];

export const registerAuthListener = (callback: (user: User | null, token: string | null) => void) => {
  listeners.push(callback);
  // Call immediately with current cached state
  callback(cachedGoogleUser, cachedAccessToken);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
};

const notifyListeners = () => {
  listeners.forEach(cb => cb(cachedGoogleUser, cachedAccessToken));
};

// Initialize auth state listener. Call this on app load.
onAuthStateChanged(auth, async (user: User | null) => {
  if (user) {
    cachedGoogleUser = user;
    if (!cachedAccessToken && !isSigningIn) {
      // If we don't have a cached token, we can sign in again or request it
      cachedGoogleUser = null;
      cachedAccessToken = null;
    }
  } else {
    cachedGoogleUser = null;
    cachedAccessToken = null;
  }
  notifyListeners();
});

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    cachedGoogleUser = result.user;
    notifyListeners();
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const getGoogleUser = (): User | null => {
  return cachedGoogleUser;
};

export const logoutGoogle = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  cachedGoogleUser = null;
  notifyListeners();
};

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
  };
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
  console.warn('Firestore Error (handled with fallback): ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
