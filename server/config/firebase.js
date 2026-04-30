/**
 * config/firebase.js - Firebase Admin SDK Initialization
 * Initializes Firestore and Firebase Admin using service account credentials.
 * - Local dev:  reads key file via GOOGLE_APPLICATION_CREDENTIALS env var
 * - Cloud Run:  uses Application Default Credentials (ADC) from attached SA
 */
const admin = require("firebase-admin");
const path  = require("path");

// Initialize Firebase Admin SDK (only once)
if (!admin.apps.length) {
  let credential;

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Local development — load key file
    const keyPath      = path.join(__dirname, "../", process.env.GOOGLE_APPLICATION_CREDENTIALS);
    const serviceAccount = require(keyPath);
    credential = admin.credential.cert(serviceAccount);
  } else {
    // Cloud Run — use Application Default Credentials from the attached service account
    credential = admin.credential.applicationDefault();
  }

  admin.initializeApp({
    credential,
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  });
}

// Export Firestore database instance for use across all services
const db = admin.firestore();
module.exports = { admin, db };
