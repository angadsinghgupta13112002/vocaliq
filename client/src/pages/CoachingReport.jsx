import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import ScoreRing from "../components/ScoreRing";
import TimestampedTranscript from "../components/TimestampedTranscript";
import { getSession } from "../services/api";

const ScoreBar = ({ label, value }) => {
  const color = value >= 8 ? "var(--green)" : value >= 6 ? "var(--brand)" : value >= 4 ? "var(--yellow)" : "var(--red)";
  return (
    <div className="score-bar-wrap">
      <div className="score-bar-header"><span>{label}</span><span style={{ color }}>{value?.toFixed(1)}</span></div>
      <div className="score-bar-track"><div className="score-bar-fill" style={{ width: `${(value / 10) * 100}%`, background: color }} /></div>
    </div>
  );
};

const TipCard = ({ tip, index }) => {
  const colors = ["var(--red)", "var(--orange)", "var(--yellow)", "var(--brand)", "var(--purple)"];
  const color  = colors[index % colors.length];
  const isPos  = tip.issue === "enthusiasm" || tip.issue === "professional_tone";
  return (
    <div className="tip-card" style={{ borderLeft: `3px solid ${isPos ? "var(--green)" : color}` }}>
      <div className="tip-card-header">
        <div className="tip-number" style={{ background: `${isPos ? "var(--green)" : color}22`, color: isPos ? "var(--green)" : color }}>
          {isPos ? "✓" : index + 1}
        </div>
        <h3>{tip.title}</h3>
      </div>
      <p style={{ color: "var(--muted)", marginBottom: 10 }}>{tip.explanation}</p>
      {tip.exercise && (
        <div className="tip-exercise">
          <strong>Exercise</strong>
          {tip.exercise}
        </div>
      )}
      {tip.rephrasing && (
        <div className="tip-exercise" style={{ marginTop: 8 }}>
          <strong>Better phrasing</strong>
          <em style={{ color: "var(--green)" }}>{tip.rephrasing}</em>
        </div>
      )}
    </div>
  );
};

const CoachingReport = () => {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [session,  setSession]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    getSession(id)
      .then(res => setSession(res.data.session))
      .catch(() => { toast.error("Session not found."); navigate("/dashboard"); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <>
      <Navbar />
      <div className="page with-navbar" style={{ textAlign: "center", paddingTop: 80 }}>
        <div style={{ width: 40, height: 40, border: "3px solid var(--brand)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .7s linear infinite", margin: "0 auto 16px" }} />
        <p className="text-muted">Loading your coaching report...</p>
      </div>
    </>
  );

  const s   = session;
  const bd  = s.scoreBreakdown || {};
  const vc  = s.vocalControl   || {};

  const scoreBadgeColor = s.overallScore >= 8 ? "var(--green)" : s.overallScore >= 6 ? "var(--brand)" : s.overallScore >= 4 ? "var(--yellow)" : "var(--red)";

  return (
    <>
      <Navbar />
      <div className="page with-navbar" style={{ maxWidth: 900 }}>
        {/* Header */}
        <div className="flex-between mb-24">
          <div>
            <button onClick={() => navigate("/dashboard")} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}>
              ← Dashboard
            </button>
            <h1 style={{ marginBottom: 6 }}>Coaching Report</h1>
            <p className="text-muted text-sm">
              {s.context?.scenario && <span className="badge badge-brand" style={{ marginRight: 6 }}>{s.context.scenario}</span>}
              <span className="badge" style={{ background: "rgba(255,255,255,.06)", color: "var(--muted)" }}>{s.mode === "audio" ? "Audio only" : "Video"}</span>
              {s.language && <span style={{ marginLeft: 8 }}>· {s.language}</span>}
            </p>
          </div>
          <button
            className="btn-primary"
            onClick={() => navigate("/session/new")}
            style={{ flexShrink: 0 }}
          >
            Try Again
          </button>
        </div>

        {/* Score hero */}
        <div className="card mb-24" style={{ display: "flex", gap: 32, alignItems: "center" }}>
          <ScoreRing score={s.overallScore || 0} size={140} />
          <div style={{ flex: 1 }}>
            <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{s.scoreJustification}</p>
            <div className="grid-3">
              {[
                ["Content",    bd.contentClarity],
                ["Delivery",   bd.emotionalDelivery],
                ["Confidence", bd.vocalConfidence],
                ["Pacing",     bd.pacing],
                ["Engagement", bd.audienceEngagement],
              ].filter(([, v]) => v != null).map(([label, val]) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: val >= 8 ? "var(--green)" : val >= 6 ? "var(--brand)" : val >= 4 ? "var(--yellow)" : "var(--red)" }}>{val?.toFixed(1)}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
          {(s.emotionDetected || s.emotionNeeded) && (
            <div style={{ flexShrink: 0, textAlign: "center", padding: "16px 24px", background: "var(--bg)", borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Detected</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--red)", marginBottom: 12 }}>{s.emotionDetected}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Needed</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--green)" }}>{s.emotionNeeded}</div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="tabs">
          {[
            ["overview",    "Overview"],
            ["transcript",  "Transcript & Timestamps"],
            ["tips",        "Improvement Tips"],
            ["vocal",       "Vocal Control"],
          ].map(([id, label]) => (
            <button key={id} className={`tab-btn${activeTab === id ? " active" : ""}`} onClick={() => setActiveTab(id)}>
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Overview */}
        {activeTab === "overview" && (
          <div className="grid-2">
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>Score Breakdown</h3>
              {[
                ["Content Clarity",     bd.contentClarity],
                ["Emotional Delivery",  bd.emotionalDelivery],
                ["Vocal Confidence",    bd.vocalConfidence],
                ["Pacing",             bd.pacing],
                ["Audience Engagement", bd.audienceEngagement],
              ].filter(([, v]) => v != null).map(([l, v]) => <ScoreBar key={l} label={l} value={v} />)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {s.improvementTips?.length > 0 && (
                <div className="card">
                  <h3 style={{ marginBottom: 12 }}>Top Improvement Tips</h3>
                  <ol style={{ paddingLeft: 18, margin: 0 }}>
                    {s.improvementTips.map((tip, i) => (
                      <li key={i} style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8, lineHeight: 1.5 }}>{tip}</li>
                    ))}
                  </ol>
                </div>
              )}
              {s.strengthsToKeep?.length > 0 && (
                <div className="card" style={{ borderLeft: "3px solid var(--green)" }}>
                  <h3 style={{ marginBottom: 12, color: "var(--green)" }}>What You're Doing Well</h3>
                  {s.strengthsToKeep.map((str, i) => (
                    <p key={i} style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6, lineHeight: 1.5 }}>✓ {str}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Transcript */}
        {activeTab === "transcript" && (
          <TimestampedTranscript transcript={s.transcript || []} />
        )}

        {/* Tab: Tips */}
        {activeTab === "tips" && (
          <div>
            {(s.detailedTips || []).map((tip, i) => <TipCard key={i} tip={tip} index={i} />)}
            {s.practicePlan && (
              <div className="card" style={{ borderLeft: "3px solid var(--brand)", marginTop: 8 }}>
                <h3 style={{ marginBottom: 10, color: "var(--brand)" }}>Your Practice Plan</h3>
                <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>{s.practicePlan}</p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Vocal Control */}
        {activeTab === "vocal" && (
          <div className="grid-2">
            {vc.pacing && (
              <div className="vocal-card">
                <div className="vocal-icon" style={{ background: "rgba(79,110,247,.15)" }}>⚡</div>
                <h3>Pacing</h3>
                <div className="wpm-display" style={{ marginTop: 8 }}>
                  <span className="wpm-num" style={{ color: "var(--yellow)" }}>{vc.pacing.current}</span>
                  <span className="wpm-label">wpm (you)</span>
                  <span style={{ color: "var(--muted)", margin: "0 4px" }}>→</span>
                  <span className="wpm-num" style={{ color: "var(--green)" }}>{vc.pacing.target}</span>
                  <span className="wpm-label">wpm (target)</span>
                </div>
                <p>{vc.pacing.technique}</p>
              </div>
            )}
            {vc.tone && (
              <div className="vocal-card">
                <div className="vocal-icon" style={{ background: "rgba(168,85,247,.15)" }}>🎵</div>
                <h3>Vocal Tone</h3>
                <p style={{ marginTop: 8 }}>{vc.tone}</p>
              </div>
            )}
            {vc.breath && (
              <div className="vocal-card">
                <div className="vocal-icon" style={{ background: "rgba(34,197,94,.15)" }}>💨</div>
                <h3>Breath Control</h3>
                <p style={{ marginTop: 8 }}>{vc.breath}</p>
              </div>
            )}
            {vc.pause && (
              <div className="vocal-card">
                <div className="vocal-icon" style={{ background: "rgba(234,179,8,.15)" }}>⏸️</div>
                <h3>Pause Technique</h3>
                <p style={{ marginTop: 8 }}>{vc.pause}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
export default CoachingReport;
