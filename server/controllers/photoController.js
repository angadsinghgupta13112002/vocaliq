/**
 * controllers/photoController.js - Photo Retrieval & Deduplication Controller
 * STEP 1+2: Fetches user photos from Google Photos / Instagram.
 * STEP 3a:  Filters out already-processed photos using Firestore hash lookup.
 * Author: Angaddeep Singh Gupta | CS651 Project 2
 */
const { db }        = require("../config/firebase");
const oauthService  = require("../services/oauthService");
const { generateHash } = require("../utils/hashHelper");

// getUserPhotos - Fetches user's photos from their connected social network (STEP 1+2)
const getUserPhotos = async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc(req.user.uid).get();
    const { accessToken, provider } = userDoc.data();

    // Fetch photos from Google Photos or Instagram depending on provider
    const photos = await oauthService.fetchUserPhotos(accessToken, provider);
    res.json({ success: true, photos });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// processNewPhotos - STEP 3a: Keeps only photos not yet in Firestore (deduplication)
const processNewPhotos = async (req, res) => {
  try {
    const { photos } = req.body; // Array of { url, id } from social network
    const userId = req.user.uid;
    const newPhotos = [];

    for (const photo of photos) {
      // Generate hash key: SHA256(userId + photoUrl)
      const hashKey = generateHash(userId + photo.url);
      const existing = await db.collection("photo_analysis").doc(hashKey).get();

      // Only keep photos not already analyzed and stored
      if (!existing.exists) {
        newPhotos.push(photo);
      }
    }

    res.json({ success: true, newPhotos, skipped: photos.length - newPhotos.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getUserPhotos, processNewPhotos };
