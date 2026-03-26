/**
 * pages/Dashboard.jsx - Aura Timeline Dashboard
 * Main view showing the user's emotional heatmap, latest Aura Report,
 * aura score trend, and quick links to photo and voice check-in views.
 * STEP 7: Displays data retrieved from Firestore via /api/dashboard
 * Author: Samuel Paul Chetty | CS651 Project 2
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import AuraHeatmap from "../components/AuraHeatmap";
import AuraCard from "../components/AuraCard";
import Navbar from "../components/Navbar";

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading]             = useState(true);
  const navigate = useNavigate();

  // Fetch all user data from the backend dashboard endpoint on mount
  useEffect(() => {
    api.get("/dashboard")
      .then((res) => setDashboardData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-spinner">Loading your Aura...</div>;

  return (
    <div className="dashboard-page">
      <Navbar />
      <main className="dashboard-main">
        <h2>Your Aura Timeline</h2>

        {/* Emotion Heatmap - visualizes mood scores over the week */}
        <AuraHeatmap photoAnalyses={dashboardData?.photoAnalyses || []} />

        {/* Latest Aura Report cards */}
        <section className="aura-reports-section">
          <h3>Weekly Aura Reports</h3>
          {dashboardData?.auraReports?.map((report) => (
            <AuraCard key={report.id} report={report} />
          ))}
        </section>

        {/* Quick action buttons */}
        <div className="quick-actions">
          <button onClick={() => navigate("/photos")}>📷 Analyze Photos</button>
          <button onClick={() => navigate("/voice")}>🎙️ Voice Check-In</button>
          <button onClick={() => navigate("/analytics")}>📊 View Analytics</button>
        </div>
      </main>
    </div>
  );
};
export default Dashboard;
