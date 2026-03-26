/**
 * controllers/audioController.js - Audio Upload Controller
 * STEP 4a: Receives audio blob from browser MediaRecorder API,
 * uploads to Google Cloud Storage, and returns the GCS public URL.
 * Author: Samuel Paul Chetty | CS651 Project 2
 */
const { db }          = require("../config/firebase");
const storageService  = require("../services/storageService");
const { generateHash } = require("../utils/hashHelper");

// uploadAudio - Stores voice recording blob in GCS and logs to Firestore (STEP 4a)
const uploadAudio = async (req, res) => {
  try {
    const userId   = req.user.uid;
    const audioBlob = req.file; // Provided by multer (memory storage)

    if (!audioBlob) return res.status(400).json({ error: "No audio file received" });

    // Upload to GCS: gs://auraboard-audio/{userId}/{timestamp}.webm
    const audioUrl = await storageService.uploadAudio(audioBlob, userId);

    // Check if this audio has already been processed (deduplication)
    const hashKey = generateHash(userId + audioUrl);
    const existing = await db.collection("audio_analysis").doc(hashKey).get();

    res.json({ success: true, audioUrl, isNew: !existing.exists, hashKey });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// getUserAudioLogs - Returns all audio analysis records for the current user
const getUserAudioLogs = async (req, res) => {
  try {
    const snapshot = await db.collection("audio_analysis")
      .where("userId", "==", req.user.uid)
      .orderBy("processedAt", "desc")
      .limit(20)
      .get();

    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { uploadAudio, getUserAudioLogs };
