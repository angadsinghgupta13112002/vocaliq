/**
 * services/storageService.js - Google Cloud Storage Service
 * Handles uploading audio blobs from MediaRecorder to GCS (STEP 4a).
 * Returns the public GCS URL used as the audioUrl key in Firestore.
 * Author: Lasya Uma Sri Lingala | CS651 Project 2
 */
const { Storage } = require("@google-cloud/storage");
const path        = require("path");

// Initialize GCS client using service account credentials from .env
const keyFile = path.join(__dirname, "../", process.env.GOOGLE_APPLICATION_CREDENTIALS);
const storage = new Storage({ keyFilename: keyFile });
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

  // Public access is granted via bucket-level IAM (allUsers Storage Object Viewer)
  return `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${fileName}`;
};

/**
 * uploadPhoto - Uploads a photo file to Google Cloud Storage
 * @param {Object} photoFile - Multer file object (buffer, mimetype, originalname)
 * @param {string} userId    - Firebase UID for organizing files per user
 * @returns {string}         - Public GCS URL
 */
const uploadPhoto = async (photoFile, userId) => {
  const timestamp = Date.now();
  const ext       = photoFile.originalname.split(".").pop() || "jpg";
  const fileName  = `photos/${userId}/${timestamp}.${ext}`;
  const gcsFile   = bucket.file(fileName);

  await gcsFile.save(photoFile.buffer, {
    metadata: { contentType: photoFile.mimetype || "image/jpeg" },
  });

  // Public access is granted via bucket-level IAM (allUsers Storage Object Viewer)
  return `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${fileName}`;
};

/**
 * uploadVideo - Uploads a video recording to Google Cloud Storage
 * @param {Object} videoFile - Multer file object (buffer, mimetype, originalname)
 * @param {string} userId    - Firebase UID for organizing files per user
 * @returns {string}         - Public GCS URL
 */
const uploadVideo = async (videoFile, userId) => {
  const timestamp = Date.now();
  const ext       = (videoFile.mimetype || "video/webm").includes("mp4") ? "mp4" : "webm";
  const fileName  = `videos/${userId}/${timestamp}.${ext}`;
  const gcsFile   = bucket.file(fileName);

  await gcsFile.save(videoFile.buffer, {
    metadata: { contentType: videoFile.mimetype || "video/webm" },
  });

  return `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${fileName}`;
};

module.exports = { uploadAudio, uploadPhoto, uploadVideo };
