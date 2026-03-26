/**
 * routes/audioRoutes.js - Audio Upload Route Definitions
 * Endpoints for uploading browser-recorded voice blobs to Google Cloud Storage (STEP 4a).
 * All routes protected by JWT authMiddleware.
 * Author: Samuel Paul Chetty | CS651 Project 2
 */
const express         = require("express");
const router          = express.Router();
const audioController = require("../controllers/audioController");
const authMiddleware  = require("../middleware/authMiddleware");
const multer          = require("multer");

// Store audio in memory buffer before uploading to GCS
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", authMiddleware, upload.single("audio"), audioController.uploadAudio);
router.get("/",        authMiddleware, audioController.getUserAudioLogs);

module.exports = router;
