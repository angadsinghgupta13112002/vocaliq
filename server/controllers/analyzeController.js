/**
 * controllers/analyzeController.js - Gemini AI Analysis Controller
 * STEP 3b: Calls Gemini Vision to analyze a photo --> outputXXX
 * STEP 4b: Calls Gemini Audio to analyze a voice recording --> outputYYY
 * STEP 5:  Calls Gemini with combined prompt --> outputZZZ (Aura Report)
 * Author: Abhinay Konuri | CS651 Project 2
 */
const { db }          = require("../config/firebase");
const geminiService   = require("../services/geminiService");
const { generateHash } = require("../utils/hashHelper");

// analyzePhoto - STEP 3b: Sends photo to Gemini Vision, stores outputXXX in Firestore
const analyzePhoto = async (req, res) => {
  try {
    const { photoUrl } = req.body;
    const userId = req.user.uid;
    const hashKey = generateHash(userId + photoUrl);

    // Call Gemini Vision API and get emotional analysis result
    const outputXXX = await geminiService.analyzePhotoWithGemini(photoUrl);

    // Store outputXXX in Firestore: photo_analysis/{hashKey}
    await db.collection("photo_analysis").doc(hashKey).set({
      userId, photoUrl, ...outputXXX, processedAt: new Date(),
    });

    res.json({ success: true, outputXXX });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// analyzeAudio - STEP 4b: Sends audio GCS URL to Gemini, stores outputYYY in Firestore
const analyzeAudio = async (req, res) => {
  try {
    const { audioUrl } = req.body;
    const userId = req.user.uid;
    const hashKey = generateHash(userId + audioUrl);

    // Call Gemini Audio API with GCS URL
    const outputYYY = await geminiService.analyzeAudioWithGemini(audioUrl);

    // Store outputYYY in Firestore: audio_analysis/{hashKey}
    await db.collection("audio_analysis").doc(hashKey).set({
      userId, audioUrl, ...outputYYY, processedAt: new Date(),
    });

    res.json({ success: true, outputYYY });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// generateAuraReport - STEP 5: Combines outputXXX + outputYYY --> outputZZZ via Gemini
const generateAuraReport = async (req, res) => {
  try {
    const userId = req.user.uid;

    // Retrieve the 7 most recent photo and audio analyses from Firestore
    const photoSnap = await db.collection("photo_analysis")
      .where("userId", "==", userId).orderBy("processedAt", "desc").limit(7).get();
    const audioSnap = await db.collection("audio_analysis")
      .where("userId", "==", userId).orderBy("processedAt", "desc").limit(7).get();

    const photoSummaries = photoSnap.docs.map(d => d.data());
    const audioSummaries = audioSnap.docs.map(d => d.data());

    // Call Gemini with combined prompt to generate the Aura Report
    const outputZZZ = await geminiService.generateAuraReport(photoSummaries, audioSummaries);

    // Store outputZZZ in Firestore: aura_reports/{userId}_{weekStart}
    const weekStart = new Date().toISOString().split("T")[0];
    await db.collection("aura_reports").doc(`${userId}_${weekStart}`).set({
      userId, weekStart, ...outputZZZ, generatedAt: new Date(),
    });

    res.json({ success: true, outputZZZ });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { analyzePhoto, analyzeAudio, generateAuraReport };
