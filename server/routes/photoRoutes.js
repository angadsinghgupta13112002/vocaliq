/**
 * routes/photoRoutes.js - Photo Retrieval Route Definitions
 * Endpoints for fetching user photos from Instagram/Google Photos (STEP 1+2).
 * All routes protected by JWT authMiddleware.
 * Author: Angaddeep Singh Gupta | CS651 Project 2
 */
const express          = require("express");
const router           = express.Router();
const photoController  = require("../controllers/photoController");
const authMiddleware   = require("../middleware/authMiddleware");

router.get("/",       authMiddleware, photoController.getUserPhotos);  // Fetch all user photos
router.post("/process", authMiddleware, photoController.processNewPhotos); // Filter + trigger Step 3

module.exports = router;
