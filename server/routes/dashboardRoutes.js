/**
 * routes/dashboardRoutes.js - Dashboard Data Route Definitions
 * Retrieves aggregated Firestore data for the Aura Timeline (STEP 7).
 * Returns photo analyses, audio logs, and aura reports for a user.
 * Author: Samuel Paul Chetty | CS651 Project 2
 */
const express              = require("express");
const router               = express.Router();
const dashboardController  = require("../controllers/dashboardController");
const authMiddleware        = require("../middleware/authMiddleware");

router.get("/",        authMiddleware, dashboardController.getDashboardData); // Aura Timeline data
router.get("/analytics", authMiddleware, dashboardController.getAnalyticsLogs); // API call logs

module.exports = router;
