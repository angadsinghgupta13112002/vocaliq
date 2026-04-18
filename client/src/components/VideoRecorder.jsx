import { useRef, useState, useEffect } from "react";

const VideoRecorder = ({ onRecordingComplete, mode = "video" }) => {
  const videoRef    = useRef(null);
  const recorderRef = useRef(null);
  const streamRef   = useRef(null);
  const chunksRef   = useRef([]);

  const [recording,  setRecording]  = useState(false);
  const [hasPreview, setHasPreview] = useState(false);
  const [elapsed,    setElapsed]    = useState(0);
  const [blobUrl,    setBlobUrl]    = useState(null);
  const timerRef = useRef(null);

  // Start camera preview on mount
  useEffect(() => {
    const constraints = mode === "audio"
      ? { audio: true }
      : { video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true };

    navigator.mediaDevices.getUserMedia(constraints)
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current && mode === "video") {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      })
      .catch(err => console.error("Camera access denied:", err));

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      clearInterval(timerRef.current);
    };
  }, [mode]);

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    setBlobUrl(null);
    setHasPreview(false);

    const mimeType = mode === "audio" ? "audio/webm;codecs=opus" : "video/webm;codecs=vp9,opus";
    const opts = MediaRecorder.isTypeSupported(mimeType) ? { mimeType } : {};
    const recorder = new MediaRecorder(streamRef.current, opts);
    recorderRef.current = recorder;

    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const type = mode === "audio" ? "audio/webm" : "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      const url  = URL.createObjectURL(blob);
      setBlobUrl(url);
      setHasPreview(true);
      if (videoRef.current && mode === "video") {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.controls = true;
      }
      onRecordingComplete(blob);
    };

    recorder.start(250);
    setRecording(true);
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
    clearInterval(timerRef.current);
  };

  const reRecord = () => {
    setBlobUrl(null);
    setHasPreview(false);
    setElapsed(0);
    if (videoRef.current && mode === "video") {
      videoRef.current.src = "";
      videoRef.current.controls = false;
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play();
    }
    onRecordingComplete(null);
  };

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;

  if (mode === "audio") {
    return (
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 32, textAlign: "center" }}>
        {/* Waveform animation */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, height: 48, marginBottom: 24 }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} style={{
              width: 4, borderRadius: 2,
              background: recording ? "var(--brand)" : "var(--border)",
              height: recording ? `${8 + ((i * 13 + Date.now() / 100) % 40)}px` : "8px",
              transition: "height .15s",
              animation: recording ? `wave ${0.4 + i * 0.05}s ease-in-out infinite alternate` : "none",
            }} />
          ))}
        </div>
        <style>{`@keyframes wave { from{height:8px} to{height:40px} }`}</style>

        {recording && (
          <div className="rec-badge" style={{ display: "inline-flex", marginBottom: 16 }}>
            <div className="rec-dot" />
            {fmt(elapsed)}
          </div>
        )}
        {hasPreview && <div style={{ color: "var(--green)", marginBottom: 16, fontSize: 14 }}>✓ Recording ready ({fmt(elapsed)})</div>}

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          {!recording && !hasPreview && (
            <button className="btn-primary" onClick={startRecording}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>
              Start Recording
            </button>
          )}
          {recording && (
            <button className="btn-danger" onClick={stopRecording}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
              Stop Recording
            </button>
          )}
          {hasPreview && (
            <button className="btn-secondary" onClick={reRecord}>Re-record</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="video-preview" style={{ marginBottom: 16 }}>
        <video ref={videoRef} muted={!hasPreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} playsInline />

        {!hasPreview && recording && (
          <div className="rec-badge">
            <div className="rec-dot" />
            {fmt(elapsed)}
          </div>
        )}

        {!hasPreview && !recording && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.4)" }}>
            <svg width="40" height="40" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.867v6.266a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            <p style={{ color: "rgba(255,255,255,.5)", marginTop: 8, fontSize: 13 }}>Camera preview</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
        {!hasPreview && (
          <div className="record-btn-wrap">
            <div className={`record-btn ${recording ? "recording" : ""} ${recording ? "record-pulse" : ""}`} onClick={recording ? stopRecording : startRecording}>
              {recording
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--red)"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="6"/></svg>}
            </div>
          </div>
        )}
        {hasPreview && (
          <button className="btn-secondary" onClick={reRecord}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Re-record
          </button>
        )}
      </div>
      {!hasPreview && (
        <p style={{ textAlign: "center", fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
          {recording ? "Click the button to stop and analyze" : "Click the red button to start recording"}
        </p>
      )}
    </div>
  );
};

export default VideoRecorder;
