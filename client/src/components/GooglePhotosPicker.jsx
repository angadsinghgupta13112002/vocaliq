/**
 * components/GooglePhotosPicker.jsx - Google Drive Video Picker
 * Displays a grid of the user's Google Drive videos.
 * Used in CoachingSession "Upload" mode as an alternative to local file picker.
 * Author: Angaddeep Singh Gupta | CS651 Project 2
 */
import { useState, useEffect } from "react";
import { listPhotosVideos, connectGooglePhotos, getPhotosStatus } from "../services/api";

/**
 * GooglePhotosPicker
 * @prop {Function} onVideoSelected  — called with { videoUrl, filename } when user picks a video
 * @prop {Function} onClose          — called when the user dismisses the picker
 */
const GooglePhotosPicker = ({ onVideoSelected, onClose }) => {
  const [videos,    setVideos]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [connected, setConnected] = useState(false);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getPhotosStatus();
        setConnected(data.photosConnected);
        if (data.photosConnected) {
          const res = await listPhotosVideos();
          setVideos(res.data.videos || []);
        }
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load Google Drive videos.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Determine modal content based on state ───────────────────────────────
  const renderContent = () => {

    // Loading
    if (loading) {
      return (
        <div className="gpp-state-center">
          <div className="gpp-spinner" />
          <p className="gpp-state-text">Loading your Google Drive videos…</p>
        </div>
      );
    }

    // Error
    if (error) {
      return (
        <div className="gpp-state-center">
          <div className="gpp-state-icon">⚠️</div>
          <h3 className="gpp-state-title">Something went wrong</h3>
          <p className="gpp-state-text">{error}</p>
          <button className="gpp-connect-btn" onClick={() => connectGooglePhotos()}>
            Reconnect Google Drive
          </button>
        </div>
      );
    }

    // Not connected
    if (!connected) {
      return (
        <div className="gpp-state-center">
          <div className="gpp-drive-icon">
            <svg width="52" height="46" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
              <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
              <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
              <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
              <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
              <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
            </svg>
          </div>
          <h2 className="gpp-connect-title">Connect Google Drive</h2>
          <p className="gpp-connect-desc">
            Browse and pick videos directly from your Google Drive — no downloading to your device first.
          </p>
          <button className="gpp-connect-btn" onClick={() => connectGooglePhotos()}>
            <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: 8, verticalAlign: "middle" }}>
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Connect with Google
          </button>
          <p className="gpp-connect-note">You'll be redirected to Google to authorize access</p>
        </div>
      );
    }

    // No videos
    if (videos.length === 0) {
      return (
        <div className="gpp-state-center">
          <div className="gpp-state-icon">📂</div>
          <h3 className="gpp-state-title">No videos found</h3>
          <p className="gpp-state-text">We couldn't find any video files in your Google Drive.</p>
          <button className="gpp-connect-btn" onClick={() => connectGooglePhotos()}>
            Reconnect Google Drive
          </button>
        </div>
      );
    }

    // Video grid
    return (
      <>
        <p className="gpp-subtitle">Select a video to analyze</p>
        <div className="gpp-grid">
          {videos.map((video) => (
            <button
              key={video.id}
              className="gpp-thumb-btn"
              onClick={() => onVideoSelected({ videoUrl: video.url, filename: video.filename })}
            >
              {video.thumbnailUrl ? (
                <img src={video.thumbnailUrl} alt={video.filename} className="gpp-thumb" loading="lazy" />
              ) : (
                <div className="gpp-thumb-placeholder">🎬</div>
              )}
              <div className="gpp-thumb-label">
                <span className="gpp-filename">{video.filename || "Video"}</span>
                {video.createdAt && (
                  <span className="gpp-date">{new Date(video.createdAt).toLocaleDateString()}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </>
    );
  };

  return (
    <>
      <style>{`
        .gpp-overlay {
          position: fixed; inset: 0;
          background: rgba(0, 0, 0, 0.75);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
          padding: 16px;
        }
        .gpp-modal {
          background: #1a1a2e;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 28px;
          width: 100%;
          max-width: 760px;
          max-height: 85vh;
          overflow-y: auto;
          position: relative;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
          animation: gpp-slide-up 0.2s ease;
        }
        @keyframes gpp-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .gpp-modal-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 4px; padding-bottom: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .gpp-modal-header h2 {
          margin: 0; font-size: 1.15rem;
          color: #e2e8f0; font-weight: 600;
          display: flex; align-items: center; gap: 8px;
        }
        .gpp-close {
          background: rgba(255,255,255,0.06); border: none;
          color: #94a3b8; font-size: 1rem; cursor: pointer;
          padding: 6px 10px; border-radius: 8px;
          transition: background 0.15s, color 0.15s;
          line-height: 1;
        }
        .gpp-close:hover { background: rgba(255,255,255,0.12); color: #e2e8f0; }

        /* Centered state screens (loading, connect, error, empty) */
        .gpp-state-center {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; text-align: center;
          padding: 40px 24px; gap: 12px;
        }
        .gpp-state-icon { font-size: 3rem; line-height: 1; }
        .gpp-state-title { color: #e2e8f0; margin: 0; font-size: 1.15rem; font-weight: 600; }
        .gpp-state-text { color: #94a3b8; margin: 0; font-size: 0.9rem; max-width: 340px; line-height: 1.6; }

        /* Google Drive icon wrapper */
        .gpp-drive-icon {
          width: 80px; height: 80px;
          background: rgba(255,255,255,0.05);
          border-radius: 20px; display: flex;
          align-items: center; justify-content: center;
          margin-bottom: 8px;
        }
        .gpp-connect-title {
          color: #e2e8f0; margin: 0;
          font-size: 1.35rem; font-weight: 700;
        }
        .gpp-connect-desc {
          color: #94a3b8; margin: 0;
          font-size: 0.9rem; max-width: 360px; line-height: 1.65;
        }
        .gpp-connect-btn {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white; border: none; border-radius: 12px;
          padding: 13px 32px; font-size: 0.95rem; font-weight: 600;
          cursor: pointer; transition: opacity 0.2s, transform 0.15s;
          display: flex; align-items: center; margin-top: 8px;
        }
        .gpp-connect-btn:hover { opacity: 0.88; transform: translateY(-1px); }
        .gpp-connect-note {
          color: #4a5568; font-size: 0.78rem; margin: 0;
        }

        /* Video grid */
        .gpp-subtitle { color: #64748b; font-size: 0.85rem; margin: 12px 0 16px; }
        .gpp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 12px;
        }
        .gpp-thumb-btn {
          background: #2d3748; border: 2px solid transparent;
          border-radius: 12px; cursor: pointer; padding: 0;
          overflow: hidden; transition: border-color 0.2s, transform 0.15s;
          text-align: left;
        }
        .gpp-thumb-btn:hover { border-color: #6366f1; transform: translateY(-2px); }
        .gpp-thumb { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
        .gpp-thumb-placeholder {
          width: 100%; aspect-ratio: 16/9;
          background: #1e293b; display: flex;
          align-items: center; justify-content: center;
          font-size: 2rem;
        }
        .gpp-thumb-label { padding: 7px 9px; }
        .gpp-filename {
          display: block; font-size: 0.75rem; color: #e2e8f0;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .gpp-date { display: block; font-size: 0.7rem; color: #64748b; margin-top: 2px; }

        /* Spinner */
        .gpp-spinner {
          width: 40px; height: 40px;
          border: 3px solid rgba(99,102,241,0.2);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: gpp-spin 0.75s linear infinite;
        }
        @keyframes gpp-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="gpp-overlay" onClick={onClose}>
        <div className="gpp-modal" onClick={(e) => e.stopPropagation()}>
          <div className="gpp-modal-header">
            <h2>
              <svg width="20" height="18" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
              </svg>
              Google Drive
            </h2>
            <button className="gpp-close" onClick={onClose}>✕</button>
          </div>

          {renderContent()}
        </div>
      </div>
    </>
  );
};

export default GooglePhotosPicker;
