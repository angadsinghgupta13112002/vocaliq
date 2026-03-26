/**
 * routes/analyzeRoutes.js - Gemini AI Analysis Route Definitions
 * Endpoints for triggering Gemini Vision (STEP 3b), Audio (STEP 4b),
 * and Cross-Modal Aura Report (STEP 5) analysis.
 * Author: Abhinay Konuri | CS651 Project 2
 */
const express            = require("express");
const router             = express.Router();
const analyzeController  = require("../controllers/analyzeController");
const authMiddleware     = require("../middleware/authMiddleware");

router.post("/photo",  authMiddleware, analyzeController.analyzePhoto);   // STEP 3b - outputXXX
router.post("/audio",  authMiddleware, analyzeController.analyzeAudio);   // STEP 4b - outputYYY
router.post("/aura",   authMiddleware, analyzeController.generateAuraReport); // STEP 5 - outputZZZ

module.exports = router;
