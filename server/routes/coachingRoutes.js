/**
 * routes/coachingRoutes.js - VocalIQ Coaching Session Routes
 * POST /analyze     - upload media + run two-pass Gemini analysis
 * GET  /sessions    - get all sessions for authenticated user
 * GET  /sessions/:id - get a single session by ID
 */
const express        = require("express");
const multer         = require("multer");
const rateLimit      = require("express-rate-limit");
const authMiddleware = require("../middleware/authMiddleware");
const { analyzeSession, getSessions, getSession, analyzeFromDrive } = require("../controllers/coachingController");

const router = express.Router();

// Strict rate limit for /analyze — each call costs real Gemini API money
// 5 analyses per 15 min per IP is generous for real use and prevents abuse
const analyzeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: "Too many analysis requests. Please wait 15 minutes." },
});

// MIME type whitelist — only allow video and audio, reject executables/zips/etc.
const ALLOWED_MIMES = [
  "video/webm", "video/mp4", "video/quicktime", "video/x-msvideo", "video/mpeg",
  "audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4", "audio/wav",
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type '${file.mimetype}' not allowed. Upload a video or audio file.`));
    }
  },
});

router.post("/analyze",            authMiddleware, analyzeLimiter, upload.single("media"), analyzeSession);
router.post("/analyze-from-drive", authMiddleware, analyzeLimiter, analyzeFromDrive);
router.get("/sessions",            authMiddleware, getSessions);
router.get("/sessions/:id",        authMiddleware, getSession);

module.exports = router;
