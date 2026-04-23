/**
 * routes/photosRoutes.js - Google Photos Library Routes
 * GET  /videos    - list user's 20 most recent Google Photos videos
 * POST /download  - download a video buffer from Google Photos
 * All routes require a valid JWT (authMiddleware).
 * Author: Angaddeep Singh Gupta | CS651 Project 2
 */
const express        = require("express");
const router         = express.Router();
const rateLimit      = require("express-rate-limit");
const authMiddleware = require("../middleware/authMiddleware");
const { listVideos, downloadVideo } = require("../controllers/photosController");

// Limit downloads to 10 per 15 min per IP — each download can be several hundred MB
const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: "Too many download requests. Please wait 15 minutes." },
});

router.get("/videos",   authMiddleware, listVideos);
router.post("/download", authMiddleware, downloadLimiter, downloadVideo);

module.exports = router;
