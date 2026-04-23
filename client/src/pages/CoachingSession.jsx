import { useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import VideoRecorder from "../components/VideoRecorder";
import GooglePhotosPicker from "../components/GooglePhotosPicker";
import { analyzeSession, downloadPhotosVideo } from "../services/api";
import { extractFrames }    from "../utils/frameExtractor";
import { extractGestures }  from "../utils/gestureExtractor";
import { trackEvent } from "../utils/analytics";

const STEPS = [
  "Extracting frames for emotion + gesture analysis...",
  "Detecting hand gestures with MediaPipe...",
  "Uploading to Gemini File API...",
  "Gemini processing your video...",
  "Pass 1: Analyzing speech, emotions, delivery...",
  "Pass 2: Building personalized coaching plan...",
  "Running Cloud Vision emotion detection...",
  "Saving your session...",
];

const CoachingSession = () => {
  const { state }  = useLocation();
  const navigate   = useNavigate();
  const context         = state?.context || {};
  const mode            = context.mode || "video";

  const [blob,              setBlob]              = useState(null);
  const [file,              setFile]              = useState(null); // for local upload
  const [analyzing,         setAnalyzing]         = useState(false);
  const [stepIdx,           setStepIdx]           = useState(0);
  const [showPhotosPicker,  setShowPhotosPicker]  = useState(false);
  const [photosVideoName,   setPhotosVideoName]   = useState(null); // name of selected photos video
  const stepTimer = useRef(null);

  // Called when user picks a video from the Google Photos picker
  const handlePhotosVideoSelected = async ({ videoUrl, filename }) => {
    setShowPhotosPicker(false);
    const downloadToast = toast.loading(`Downloading "${filename}" from Google Photos…`);
    try {
      const videoBlob = await downloadPhotosVideo(videoUrl);
      // Create a File object so it behaves identically to a local file upload
      const videoFile = new File([videoBlob], filename || "photos_video.mp4", { type: "video/mp4" });
      setFile(videoFile);
      setPhotosVideoName(filename);
      toast.success("Video ready for analysis!", { id: downloadToast });
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to download from Google Photos.", { id: downloadToast });
    }
  };

  const handleSubmit = async () => {
    const mediaBlob = blob || file;
    if (!mediaBlob) return toast.error("Please record or upload a video first.");

    setAnalyzing(true);
    setStepIdx(0);
    trackEvent("session_submitted", { mode, scenario: context.scenario || "General" });

    // Fake progress steps (each ~12 seconds) while API runs
    stepTimer.current = setInterval(() => {
      setStepIdx(i => (i < STEPS.length - 1 ? i + 1 : i));
    }, 12000);

    try {
      // ── Step 1 & 2: Extract frames (Cloud Vision) + gestures (MediaPipe) ─
      // Both run client-side on video modes only, in parallel for speed.
      let framesJson   = null;
      let gesturesJson = null;

      if (mode !== "audio") {
        const [frames, gestures] = await Promise.allSettled([
          extractFrames(mediaBlob, 3, 20, 0.7),
          extractGestures(mediaBlob, 3, 20),
        ]);

        if (frames.status === "fulfilled" && frames.value.length > 0) {
          framesJson = JSON.stringify(frames.value);
          console.log(`[session] Extracted ${frames.value.length} frames for Vision`);
        } else {
          console.warn("[session] Frame extraction failed or returned empty");
        }

        if (gestures.status === "fulfilled" && gestures.value.length > 0) {
          gesturesJson = JSON.stringify(gestures.value);
          console.log(`[session] Extracted ${gestures.value.length} gesture frames`);
        } else {
          console.warn("[session] Gesture extraction failed or returned empty");
        }
      }

      // ── Step 3: Build multipart form data ────────────────────────────
      const formData = new FormData();
      const ext      = mode === "audio" ? "webm" : "webm";
      formData.append("media",    mediaBlob, `recording.${ext}`);
      formData.append("scenario", context.scenario || "General presentation");
      formData.append("audience", context.audience || "General audience");
      formData.append("goal",     context.goal     || "Communicate effectively");
      formData.append("mode",     mode);
      if (framesJson)   formData.append("frames",   framesJson);
      if (gesturesJson) formData.append("gestures", gesturesJson);

      const res = await analyzeSession(formData);
      clearInterval(stepTimer.current);

      if (res.data.success) {
        trackEvent("session_complete", { mode, scenario: context.scenario || "General" });
        toast.success("Analysis complete!");
        navigate(`/report/${res.data.sessionId}`);
      }
    } catch (err) {
      clearInterval(stepTimer.current);
      setAnalyzing(false);
      toast.error(err.response?.data?.error || "Analysis failed. Please try again.");
    }
  };

  const handleFileUpload = (e) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setPhotosVideoName(null); }
  };

  return (
    <>
      <Navbar />
      <div className="page with-navbar" style={{ maxWidth: 800 }}>
        {/* Header */}
        <div className="flex-between mb-24">
          <div>
            <button
              onClick={() => navigate("/session/new")}
              style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}
            >
              ← Back to Setup
            </button>
            <h1 style={{ marginBottom: 4 }}>
              {mode === "upload" ? "Upload Your Speech" : mode === "audio" ? "Record Audio" : "Record Your Speech"}
            </h1>
            <p className="text-muted text-sm">
              {context.scenario && <span className="badge badge-brand" style={{ marginRight: 6 }}>{context.scenario}</span>}
              {context.audience && <span className="badge badge-brand" style={{ marginRight: 6 }}>{context.audience}</span>}
              {context.goal     && <span className="badge badge-brand">{context.goal}</span>}
            </p>
          </div>
        </div>

        {/* Analyzing overlay */}
        {analyzing ? (
          <div className="card" style={{ textAlign: "center", padding: "48px 32px" }}>
            <div style={{ marginBottom: 32 }}>
              <div style={{ width: 64, height: 64, border: "3px solid var(--brand)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .7s linear infinite", margin: "0 auto 20px" }} />
              <h2 style={{ marginBottom: 8 }}>Analyzing your speech...</h2>
              <p className="text-muted text-sm">This takes 30–90 seconds. Gemini is watching, listening, and coaching.</p>
            </div>
            <div style={{ textAlign: "left", maxWidth: 360, margin: "0 auto" }}>
              {STEPS.map((step, i) => (
                <div key={i} className="processing-step">
                  <div className={`step-icon ${i < stepIdx ? "done" : i === stepIdx ? "active" : "pending"}`}>
                    {i < stepIdx && (
                      <svg width="10" height="10" viewBox="0 0 20 20" fill="white"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                    )}
                  </div>
                  <span style={{ color: i <= stepIdx ? "var(--text)" : "var(--muted)", fontSize: 13 }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid-2" style={{ alignItems: "start" }}>
            {/* Left: recorder or uploader */}
            <div>
              {mode === "upload" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                  {/* Local file drop zone */}
                  <label
                    className="dropzone"
                    style={{ display: "block", cursor: "pointer" }}
                    onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("dragover"); }}
                    onDragLeave={e => e.currentTarget.classList.remove("dragover")}
                    onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove("dragover"); const f = e.dataTransfer.files?.[0]; if (f) { setFile(f); setPhotosVideoName(null); } }}
                  >
                    <input type="file" accept="video/*,audio/*" style={{ display: "none" }} onChange={handleFileUpload} />
                    <div style={{ fontSize: 32, marginBottom: 12 }}>📁</div>
                    <p style={{ fontWeight: 600, color: "white", marginBottom: 4 }}>
                      {photosVideoName
                        ? `📷 ${photosVideoName}`
                        : file
                        ? file.name
                        : "Drop your video here"}
                    </p>
                    <p className="text-muted text-xs">
                      {file
                        ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
                        : "MP4, WebM, MOV · max 500 MB · click to browse"}
                    </p>
                  </label>

                  {/* Google Photos button */}
                  <button
                    type="button"
                    onClick={() => setShowPhotosPicker(true)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      gap: 8, padding: "10px 16px",
                      background: "#1e293b", border: "1px solid #334155",
                      borderRadius: 10, color: "#cbd5e1", cursor: "pointer",
                      fontSize: 14, fontWeight: 500, transition: "border-color .2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#6366f1"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "#334155"}
                  >
                    <span style={{ fontSize: 18 }}>📷</span>
                    Browse Google Photos
                  </button>

                  {/* Video preview */}
                  {file && (
                    <div style={{ marginTop: 4 }}>
                      <video
                        src={URL.createObjectURL(file)}
                        controls
                        style={{ width: "100%", borderRadius: 12, background: "#000" }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <VideoRecorder mode={mode} onRecordingComplete={setBlob} />
              )}
            </div>

            {/* Right: context summary + submit */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="card-sm">
                <p style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 12 }}>Session Context</p>
                {[
                  ["Scenario", context.scenario],
                  ["Audience", context.audience],
                  ["Goal",     context.goal],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                    <span className="text-muted">{k}</span>
                    <span style={{ color: "var(--text)", fontWeight: 500, textAlign: "right", maxWidth: "55%" }}>{v}</span>
                  </div>
                ))}
              </div>

              <div className="card-sm">
                <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
                  <strong style={{ color: "var(--text)" }}>Two-pass AI + Emotion Analysis:</strong><br/>
                  Gemini analyzes your speech in two passes. Cloud Vision tracks facial expressions
                  frame-by-frame to show when you looked nervous or confident.
                </p>
                <p className="text-xs text-muted">⏱ Takes 30–90 seconds after submission</p>
              </div>

              <button
                className="btn-primary"
                style={{ justifyContent: "center", opacity: (blob || file) ? 1 : 0.5 }}
                disabled={!blob && !file}
                onClick={handleSubmit}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                Analyze My Speech
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Google Photos picker modal */}
      {showPhotosPicker && (
        <GooglePhotosPicker
          onVideoSelected={handlePhotosVideoSelected}
          onClose={() => setShowPhotosPicker(false)}
        />
      )}
    </>
  );
};
export default CoachingSession;
