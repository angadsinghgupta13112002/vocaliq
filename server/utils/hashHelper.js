/**
 * utils/hashHelper.js - SHA256 Hash Generator
 * Generates a unique hash key for deduplication of photos and audio.
 * Used in STEP 3a and 4b to check if a photo/audio URL has already
 * been processed and stored in Firestore.
 * Author: Lasya Uma Sri Lingala | CS651 Project 2
 */
const crypto = require("crypto");

/**
 * generateHash - Creates a SHA256 hash from a string
 * @param {string} input - Typically "userId + photoUrl" or "userId + audioUrl"
 * @returns {string} - Hex digest hash used as Firestore document key
 */
const generateHash = (input) => {
  return crypto.createHash("sha256").update(input).digest("hex");
};
module.exports = { generateHash };
