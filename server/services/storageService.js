/**
 * services/storageService.js - Google Cloud Storage Service
 * Handles uploading audio blobs from MediaRecorder to GCS (STEP 4a).
 * Returns the public GCS URL used as the audioUrl key in Firestore.
 * Author: Lasya Uma Sri Lingala | CS651 Project 2
 */
const { Storage } = require("@google-cloud/storage");

// Initialize GCS client using service account credentials from .env
const storage = new Storage({ keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS });
const bucket  = storage.bucket(process.env.GCS_BUCKET_NAME);

/**
 * uploadAudio - Uploads a voice recording blob to Google Cloud Storage
 * @param {Object} audioFile - Multer file object (buffer, mimetype, originalname)
 * @param {string} userId    - Firebase UID for organizing files per user
 * @returns {string}         - Public GCS URL: gs://bucket/{userId}/{timestamp}.webm
 */
const uploadAudio = async (audioFile, userId) => {
  const timestamp  = Date.now();
  const fileName   = `${userId}/${timestamp}.webm`;
  const gcsFile    = bucket.file(fileName);

  // Upload the buffer directly to GCS
  await gcsFile.save(audioFile.buffer, {
    metadata: { contentType: audioFile.mimetype || "audio/webm" },
  });

  // Make the file publicly readable
  await gcsFile.makePublic();

  // Return the public HTTPS URL
  return `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${fileName}`;
};

module.exports = { uploadAudio };
