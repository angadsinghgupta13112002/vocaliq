import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { trackEvent } from "../utils/analytics";

const FEATURES = [
  {
    icon: "🤖",
    color: "#4f6ef7",
    title: "Three-Pass Gemini AI",
    desc: "Pass 1 scores your speech across 5 dimensions. Pass 2 builds a grounded coaching plan. Pass 3 analyzes hand gestures from the same upload — zero extra cost.",
  },
  {
    icon: "😊",
    color: "#f97316",
    title: "Emotion Timeline",
    desc: "Cloud Vision Face Detection reads every frame. See second-by-second when you looked confident, nervous, or anxious — and exactly when your expression changed.",
  },
  {
    icon: "🖐️",
    color: "#a855f7",
    title: "Hand Gesture Detection",
    desc: "MediaPipe tracks 21 hand landmarks per frame in the browser. Get an expressiveness score, gesture breakdown, and coaching tips based on what your hands actually did.",
  },
  {
    icon: "👁️",
    color: "#22c55e",
    title: "Eye Contact Tracking",
    desc: "Cloud Vision returns face pan and tilt angles for every frame. We calculate the exact percentage of your speech where you maintained direct camera eye contact.",
  },
  {
    icon: "📁",
    color: "#eab308",
    title: "Google Drive Upload",
    desc: "Connect your Google Drive and analyze any video directly — no download required. The server processes the file end-to-end, bypassing all browser size limits.",
  },
  {
    icon: "🎙️",
    color: "#06b6d4",
    title: "Three Recording Modes",
    desc: "Record video with webcam, record audio only, or upload an existing file. All modes feed the same full Gemini + Vision + Gesture analysis pipeline.",
  },
];

const TECH = [
  { label: "Gemini 2.5 Flash", bg: "rgba(79,110,247,.15)", color: "#a5b4fc" },
  { label: "Cloud Vision API", bg: "rgba(249,115,22,.15)",  color: "#fdba74" },
  { label: "MediaPipe",        bg: "rgba(168,85,247,.15)", color: "#d8b4fe" },
  { label: "Cloud Run",        bg: "rgba(34,197,94,.15)",  color: "#86efac" },
  { label: "Firestore",        bg: "rgba(234,179,8,.15)",  color: "#fde047" },
  { label: "Google OAuth 2.0", bg: "rgba(6,182,212,.15)",  color: "#67e8f9" },
];

const LoginPage = () => {
  const { user, loginWithToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get("token");
    if (token) {
      loginWithToken(token);
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  useEffect(() => {
    if (user) {
      trackEvent("login", { method: "google" });
      navigate("/dashboard");
    }
  }, [user]);

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || "http://localhost:8080/api"}/auth/google`;
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% -10%, rgba(79,110,247,.2) 0%, transparent 55%), var(--bg)",
      overflowX: "hidden",
    }}>

      {/* ── Hero ────────────────────────────────────────── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "80px 24px 56px", textAlign: "center" }}>

        {/* Logo */}
        <div style={{
          width: 72, height: 72, borderRadius: 18,
          background: "var(--brand)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 900, fontSize: 28, color: "white",
          margin: "0 auto 28px",
          boxShadow: "0 0 40px rgba(79,110,247,.4)",
        }}>V</div>

        {/* Title */}
        <h1 style={{ fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 800, margin: "0 0 16px", letterSpacing: "-1px", lineHeight: 1.1 }}>
          VocalIQ
        </h1>

        {/* Tagline */}
        <p style={{ fontSize: "clamp(16px, 2.5vw, 20px)", color: "var(--muted)", maxWidth: 600, margin: "0 auto 12px", lineHeight: 1.6 }}>
          AI-powered speaking coach that analyzes your speech, emotions, eye contact,
          and hand gestures — all in one 90-second report.
        </p>

        <p style={{ fontSize: 13, color: "rgba(107,114,128,.7)", marginBottom: 40 }}>
          CS651 Web Systems · Professor Lynne Grewe · Cal State East Bay
        </p>

        {/* CTA */}
        <button onClick={handleGoogleLogin} style={{
          background: "white", color: "#1f2937",
          border: "none", borderRadius: 12, padding: "14px 32px",
          fontSize: 15, fontWeight: 600, cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 10,
          transition: "opacity .2s, transform .1s",
          boxShadow: "0 4px 24px rgba(0,0,0,.4)",
          marginBottom: 16,
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = ".9"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          onMouseDown={e => e.currentTarget.style.transform = "scale(.97)"}
          onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p style={{ fontSize: 12, color: "var(--muted)" }}>
          Secure OAuth 2.0 · we never store your password
        </p>
      </div>

      {/* ── Tech stack pills ─────────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, padding: "0 24px 56px" }}>
        {TECH.map(t => (
          <span key={t.label} style={{
            background: t.bg, color: t.color,
            fontSize: 12, fontWeight: 600,
            padding: "5px 14px", borderRadius: 20,
          }}>{t.label}</span>
        ))}
      </div>

      {/* ── Divider ──────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid var(--border)", maxWidth: 800, margin: "0 auto" }} />

      {/* ── Feature grid ─────────────────────────────────── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "56px 24px" }}>
        <p style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 32 }}>
          What VocalIQ analyzes
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 16, padding: "20px 20px",
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${f.color}1a`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, marginBottom: 14,
              }}>{f.icon}</div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "white", marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works ─────────────────────────────────── */}
      <div style={{ borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "56px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 40 }}>
            How it works
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 0 }}>
            {[
              { n: "1", label: "Sign in",       sub: "Google OAuth 2.0" },
              { n: "2", label: "Set context",   sub: "Scenario · Audience · Goal" },
              { n: "3", label: "Record or upload", sub: "Video · Audio · Drive" },
              { n: "4", label: "Get your report", sub: "Score · Emotions · Gestures · Plan" },
            ].map((step, i, arr) => (
              <div key={step.n} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ textAlign: "center", padding: "0 16px" }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: "rgba(79,110,247,.15)", border: "1px solid rgba(79,110,247,.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 14, color: "var(--brand)",
                    margin: "0 auto 10px",
                  }}>{step.n}</div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "white", marginBottom: 4 }}>{step.label}</p>
                  <p style={{ fontSize: 11, color: "var(--muted)" }}>{step.sub}</p>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ color: "var(--border)", fontSize: 18, marginBottom: 24 }}>→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid var(--border)", textAlign: "center", padding: "24px", fontSize: 12, color: "var(--muted)" }}>
        Built by Angaddeep Singh Gupta · Abhinay Konuri · Samuel Paul Chetty · Lasya Uma Sri Lingala
        &nbsp;·&nbsp; CS651 Project 2
      </div>

    </div>
  );
};

export default LoginPage;
