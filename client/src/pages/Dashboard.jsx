import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import ScoreChart from "../components/ScoreChart";
import { getSessions } from "../services/api";

const fmt = (dateVal) => {
  if (!dateVal) return "—";
  const d = dateVal?.toDate?.() || new Date(dateVal?._seconds ? dateVal._seconds * 1000 : dateVal);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const scoreColor = (s) => s >= 8 ? "var(--green)" : s >= 6 ? "var(--brand)" : s >= 4 ? "var(--yellow)" : "var(--red)";

const Dashboard = () => {
  const { user }                = useAuth();
  const navigate                = useNavigate();
  const [searchParams]          = useSearchParams();
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);

  // Show toast if redirected back from Google Photos OAuth
  useEffect(() => {
    if (searchParams.get("photosConnected")) {
      toast.success("✅ Google Photos connected! Start a new session to browse your videos.", { duration: 5000 });
    }
    if (searchParams.get("photosError")) {
      toast.error(`Google Photos error: ${searchParams.get("photosError")}`, { duration: 5000 });
    }
  }, []);

  useEffect(() => {
    getSessions()
      .then(res => setSessions(res.data.sessions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const latest    = sessions[0];
  const best      = sessions.length ? Math.max(...sessions.map(s => s.overallScore || 0)) : null;
  const avg       = sessions.length ? (sessions.reduce((a, s) => a + (s.overallScore || 0), 0) / sessions.length).toFixed(1) : null;
  const prevScore = sessions[1]?.overallScore;
  const scoreDiff = latest && prevScore ? (latest.overallScore - prevScore).toFixed(1) : null;

  return (
    <>
      <Navbar />
      <div className="page with-navbar" style={{ maxWidth: 960 }}>
        <div className="flex-between mb-24">
          <div>
            <h1 style={{ marginBottom: 4 }}>Welcome back, {user?.displayName?.split(" ")[0]} 👋</h1>
            <p className="text-muted">
              {sessions.length > 0
                ? `${sessions.length} session${sessions.length > 1 ? "s" : ""} · Keep improving`
                : "Start your first coaching session below"}
            </p>
          </div>
          <button className="btn-primary" onClick={() => navigate("/session/new")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            New Session
          </button>
        </div>

        {/* Stats */}
        <div className="grid-3 mb-24">
          <div className="stat-card">
            <div className="stat-label">Latest Score</div>
            <div className="stat-value" style={{ color: latest ? scoreColor(latest.overallScore) : "var(--muted)" }}>
              {latest ? latest.overallScore?.toFixed(1) : "—"}
            </div>
            {scoreDiff && (
              <div className={`stat-change ${Number(scoreDiff) >= 0 ? "up" : "down"}`}>
                {Number(scoreDiff) >= 0 ? "↑" : "↓"} {Math.abs(scoreDiff)} from last session
              </div>
            )}
            {!latest && <div className="text-muted text-xs">No sessions yet</div>}
          </div>
          <div className="stat-card">
            <div className="stat-label">Best Score</div>
            <div className="stat-value" style={{ color: best ? scoreColor(best) : "var(--muted)" }}>
              {best ? best.toFixed(1) : "—"}
            </div>
            {sessions.length > 0 && <div className="text-muted text-xs">{sessions.length} total sessions</div>}
          </div>
          <div className="stat-card">
            <div className="stat-label">Average Score</div>
            <div className="stat-value" style={{ color: avg ? scoreColor(Number(avg)) : "var(--muted)" }}>{avg || "—"}</div>
            {latest?.wpm && <div className="text-muted text-xs">Last WPM: {latest.wpm}</div>}
          </div>
        </div>

        <div className="grid-2" style={{ alignItems: "start" }}>
          <div className="card">
            <h2 style={{ marginBottom: 20 }}>Score Progress</h2>
            <ScoreChart sessions={sessions} />
          </div>

          <div className="card">
            <div className="flex-between mb-16">
              <h2 style={{ marginBottom: 0 }}>Session History</h2>
            </div>

            {loading && <p className="text-muted text-sm">Loading sessions...</p>}

            {!loading && sessions.length === 0 && (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎙️</div>
                <p style={{ color: "var(--muted)", marginBottom: 16, fontSize: 14 }}>
                  No sessions yet. Record your first speech and get AI coaching.
                </p>
                <button className="btn-primary" onClick={() => navigate("/session/new")}>
                  Start My First Session
                </button>
              </div>
            )}

            {sessions.slice(0, 6).map((s) => (
              <div key={s.sessionId} className="session-item" style={{ cursor: "default" }}>
                <div
                  className="session-score-badge"
                  style={{ background: `${scoreColor(s.overallScore)}22`, color: scoreColor(s.overallScore), cursor: "pointer" }}
                  onClick={() => navigate(`/report/${s.sessionId}`)}
                >
                  {s.overallScore?.toFixed(1)}
                </div>
                <div
                  className="session-info"
                  style={{ flex: 1, cursor: "pointer" }}
                  onClick={() => navigate(`/report/${s.sessionId}`)}
                >
                  <div className="session-scenario">{s.context?.scenario || "Session"}</div>
                  <div className="session-meta">
                    {fmt(s.createdAt)} · {s.mode === "audio" ? "Audio" : "Video"}
                    {s.language && ` · ${s.language}`}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {s.mediaUrl && (
                    <button
                      onClick={() => navigate(`/report/${s.sessionId}?tab=recording`)}
                      title={s.mode === "audio" ? "Play recording" : "Watch recording"}
                      style={{
                        background: "rgba(79,110,247,.15)",
                        border: "none",
                        color: "var(--brand)",
                        borderRadius: 6,
                        padding: "4px 10px",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 700,
                        lineHeight: 1,
                      }}
                    >
                      ▶
                    </button>
                  )}
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="var(--muted)" strokeWidth="2"
                    style={{ cursor: "pointer", flexShrink: 0 }}
                    onClick={() => navigate(`/report/${s.sessionId}`)}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
export default Dashboard;
