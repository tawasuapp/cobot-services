const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let firebaseApp = null;

function initializeFirebase() {
  if (firebaseApp) return firebaseApp;

  try {
    // Option 1: Use Admin SDK JSON file (preferred)
    const sdkPath = process.env.FIREBASE_ADMIN_SDK_PATH;
    if (sdkPath) {
      const fullPath = path.resolve(sdkPath);
      if (fs.existsSync(fullPath)) {
        const serviceAccount = require(fullPath);
        firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        });
        console.log('Firebase initialized from Admin SDK JSON');
        return firebaseApp;
      }
    }

    // Option 2: Use individual env vars
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (projectId && privateKey && clientEmail) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey: privateKey.replace(/\\n/g, '\n'),
          clientEmail,
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
      console.log('Firebase initialized from env vars');
      return firebaseApp;
    }

    console.warn('Firebase credentials not configured. Push notifications will be disabled.');
    return null;
  } catch (error) {
    console.error('Firebase initialization failed:', error.message);
    return null;
  }
}

function getMessaging() {
  if (!firebaseApp) return null;
  return admin.messaging();
}

module.exports = { initializeFirebase, getMessaging };
