/**
 * controllers/dashboardController.js - Dashboard Data Controller
 * STEP 7: Retrieves and aggregates all Firestore data for a user's
 * Aura Timeline, photo gallery, audio logs, and analytics tab.
 * Author: Samuel Paul Chetty | CS651 Project 2
 */
const { db } = require("../config/firebase");

// getDashboardData - Returns all data needed for the Aura Timeline dashboard (STEP 7)
const getDashboardData = async (req, res) => {
  try {
    const userId = req.user.uid;

    // Fetch latest aura reports, photo analyses, and audio analyses in parallel
    const [reportsSnap, photosSnap, audioSnap] = await Promise.all([
      db.collection("aura_reports").where("userId","==",userId).orderBy("generatedAt","desc").limit(10).get(),
      db.collection("photo_analysis").where("userId","==",userId).orderBy("processedAt","desc").limit(20).get(),
      db.collection("audio_analysis").where("userId","==",userId).orderBy("processedAt","desc").limit(10).get(),
    ]);

    res.json({
      success: true,
      auraReports:   reportsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      photoAnalyses: photosSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      audioLogs:     audioSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// getAnalyticsLogs - Returns API call logs for the Analytics dashboard tab
const getAnalyticsLogs = async (req, res) => {
  try {
    const snapshot = await db.collection("analytics_logs")
      .where("userId", "==", req.user.uid)
      .orderBy("timestamp", "desc")
      .limit(50)
      .get();

    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getDashboardData, getAnalyticsLogs };
