/**
 * config/firebase.js - Firebase Admin SDK Initialization
 * Initializes Firestore and Firebase Admin using service account credentials.
 * All Firestore reads/writes in the app go through this initialized instance.
 * Author: Lasya Uma Sri Lingala | CS651 Project 2
 */
const admin = require("firebase-admin");

// Load service account from file path specified in .env
const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);

// Initialize Firebase Admin SDK (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  });
}

// Export Firestore database instance for use across all services
const db = admin.firestore();
module.exports = { admin, db };
