import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const SCENARIOS = ["Job Interview", "Business Pitch", "Class Presentation", "Conference Talk", "Wedding Speech", "Sales Call", "TED-style Talk", "Other"];
const AUDIENCES = ["Hiring Panel", "Investors", "Professors / Classmates", "General Public", "Executives", "Clients", "Friends & Family", "Other"];
const GOALS     = ["Be Confident & Persuasive", "Be Clear & Informative", "Be Inspiring & Motivating", "Be Professional & Authoritative", "Connect Emotionally"];

const SessionSetup = () => {
  const navigate = useNavigate();
  const [mode,     setMode]     = useState("video");
  const [scenario, setScenario] = useState("");
  const [audience, setAudience] = useState("");
  const [goal,     setGoal]     = useState("");
  const [extra,    setExtra]    = useState("");

  const handleStart = () => {
    const context = {
      scenario: scenario || "General presentation",
      audience: audience || "General audience",
      goal:     goal     || "Communicate effectively",
      extra,
      mode,
    };
    navigate("/session/record", { state: { context } });
  };

  return (
    <>
      <Navbar />
      <div className="page with-navbar" style={{ maxWidth: 760 }}>
        <div className="mb-24">
          <h1>New Coaching Session</h1>
          <p className="text-muted">Choose your input method and tell VocalIQ about your speech so it can give context-aware coaching.</p>
        </div>

        {/* Mode selection */}
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Input Method</h2>
        <div className="mode-grid mb-24">
          {[
            { id: "video", icon: "🎥", title: "Record Video", desc: "Full face + voice analysis. Best results.", badge: "Recommended", color: "var(--brand)" },
            { id: "upload", icon: "📁", title: "Upload Video", desc: "Analyze a pre-recorded MP4 or WebM file.", badge: "Face + voice", color: "var(--purple)" },
            { id: "audio", icon: "🎙️", title: "Audio Only", desc: "Voice, transcript, and pacing — no camera needed.", badge: "Voice only", color: "var(--green)" },
          ].map(({ id, icon, title, desc, badge, color }) => (
            <div key={id} className={`mode-card${mode === id ? " active" : ""}`} onClick={() => setMode(id)}>
              <div className="mode-icon" style={{ background: `${color}22` }}>
                <span style={{ fontSize: 22 }}>{icon}</span>
              </div>
              <h3>{title}</h3>
              <p>{desc}</p>
              <div className="mode-badge" style={{ color }}>{badge}</div>
            </div>
          ))}
        </div>

        {/* Context form */}
        <div className="card mb-24">
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 20 }}>
            Speech Context <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— optional but improves coaching accuracy</span>
          </h2>

          <div className="grid-3" style={{ marginBottom: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">What is this speech for?</label>
              <select className="form-select" value={scenario} onChange={e => setScenario(e.target.value)}>
                <option value="">Select scenario...</option>
                {SCENARIOS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Who is your audience?</label>
              <select className="form-select" value={audience} onChange={e => setAudience(e.target.value)}>
                <option value="">Select audience...</option>
                {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Your main goal</label>
              <select className="form-select" value={goal} onChange={e => setGoal(e.target.value)}>
                <option value="">Select goal...</option>
                {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Additional context <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></label>
            <textarea
              className="form-input form-textarea"
              placeholder='e.g. "Applying for a senior software engineer role at a 50-person startup. The panel includes the CTO and two engineers."'
              value={extra}
              onChange={e => setExtra(e.target.value)}
            />
          </div>
        </div>

        <button className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "14px 24px" }} onClick={handleStart}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Start Session
        </button>
      </div>
    </>
  );
};
export default SessionSetup;
