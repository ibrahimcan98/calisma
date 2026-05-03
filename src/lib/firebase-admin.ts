import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

declare global {
  var __firebaseAdminApp: App | undefined;
  var __firebaseAdminAuth: Auth | undefined;
  var __firebaseAdminDb: Firestore | undefined;
}

const initializeFirebaseAdmin = (): App => {
  const apps = getApps();
  if (apps.length > 0) return apps[0];

  const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (serviceAccountVar) {
    try {
      const serviceAccount = JSON.parse(serviceAccountVar);
      return initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
      });
    } catch (e) {
      console.error('Firebase Admin Env parse failed:', e);
    }
  }

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    return initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || projectId,
    });
  }

  // Fallback for build time or minimal config
  return initializeApp({
    projectId: projectId || 'placeholder-id',
  });
};

if (!global.__firebaseAdminApp) {
  global.__firebaseAdminApp = initializeFirebaseAdmin();
  global.__firebaseAdminAuth = getAuth(global.__firebaseAdminApp);
  global.__firebaseAdminDb = getFirestore(global.__firebaseAdminApp);
}

export const adminAuth = global.__firebaseAdminAuth!;
export const adminDb = global.__firebaseAdminDb!;
