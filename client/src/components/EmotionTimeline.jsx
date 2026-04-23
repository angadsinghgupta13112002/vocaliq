/**
 * components/EmotionTimeline.jsx - Emotion Timeline Visualization
 * Displays a second-by-second emotion chart from Cloud Vision face detection.
 * Part of the coaching report — shows when the speaker looked nervous vs confident.
 * Author: Samuel Paul Chetty | CS651 Project 2
 */

// Color mapping for each coaching emotion label
const EMOTION_COLORS = {
  confident:  "#22c55e",  // green
  engaged:    "#84cc16",  // lime
  neutral:    "#94a3b8",  // slate
  anxious:    "#f59e0b",  // amber
  nervous:    "#f97316",  // orange
  frustrated: "#ef4444",  // red
  surprised:  "#a78bfa",  // violet
  unknown:    "#475569",  // dark slate
};

// Human-readable labels
const EMOTION_LABELS = {
  confident:  "Confident",
  engaged:    "Engaged",
  neutral:    "Neutral",
  anxious:    "Anxious",
  nervous:    "Nervous",
  frustrated: "Frustrated",
  surprised:  "Surprised",
  unknown:    "Unknown",
};

// Emoji for each emotion
const EMOTION_EMOJI = {
  confident:  "😊",
  engaged:    "🙂",
  neutral:    "😐",
  anxious:    "😟",
  nervous:    "😰",
  frustrated: "😤",
  surprised:  "😲",
  unknown:    "❓",
};

/**
 * EmotionTimeline
 * @prop {Array}  timeline     — [{ second, emotion, confidence }, ...] from coachingReport
 * @prop {Object} summary      — { dominantEmotion, emotionCounts, nervousSeconds, confidentSeconds }
 * @prop {number} [videoDuration] — total video duration in seconds (optional, for scaling)
 */
const EYE_CONTACT_COLOR = {
  excellent:  "#22c55e",
  good:       "#84cc16",
  needs_work: "#f59e0b",
  poor:       "#ef4444",
  unknown:    "#94a3b8",
};

const EYE_CONTACT_LABEL = {
  excellent:  "Excellent",
  good:       "Good",
  needs_work: "Needs Work",
  poor:       "Poor",
  unknown:    "N/A",
};

const EmotionTimeline = ({ timeline = [], summary = {} }) => {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="et-empty">
        <span>😐</span>
        <p>No face detection data available for this session.</p>
        <p className="et-hint">
          Emotion tracking requires a front-facing camera with your face visible.
        </p>
      </div>
    );
  }

  const {
    dominantEmotion,
    emotionCounts = {},
    nervousSeconds = [],
    confidentSeconds = [],
    eyeContactPercent = null,
    eyeContactRating  = "unknown",
    lookingAwaySeconds = [],
  } = summary;
  const totalFrames = timeline.length;

  // Format seconds as MM:SS
  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // For the bar chart — sort emotions by count descending
  const emotionEntries = Object.entries(emotionCounts).sort(([, a], [, b]) => b - a);

  return (
    <div className="et-root">
      {/* ── Summary Cards ────────────────────────────────────────────────── */}
      <div className="et-cards">
        <div className="et-card">
          <div className="et-card-emoji">{EMOTION_EMOJI[dominantEmotion] || "😐"}</div>
          <div className="et-card-value" style={{ color: EMOTION_COLORS[dominantEmotion] || "#94a3b8" }}>
            {EMOTION_LABELS[dominantEmotion] || dominantEmotion}
          </div>
          <div className="et-card-label">Dominant Emotion</div>
        </div>

        <div className="et-card">
          <div className="et-card-emoji">😰</div>
          <div className="et-card-value" style={{ color: "#f97316" }}>
            {nervousSeconds.length > 0 ? `${nervousSeconds.length} frames` : "None detected"}
          </div>
          <div className="et-card-label">Nervous Moments</div>
          {nervousSeconds.length > 0 && (
            <div className="et-timestamps">
              {nervousSeconds.slice(0, 5).map((s) => (
                <span key={s} className="et-chip et-chip-nervous">{formatTime(s)}</span>
              ))}
              {nervousSeconds.length > 5 && (
                <span className="et-chip-more">+{nervousSeconds.length - 5} more</span>
              )}
            </div>
          )}
        </div>

        <div className="et-card">
          <div className="et-card-emoji">😊</div>
          <div className="et-card-value" style={{ color: "#22c55e" }}>
            {confidentSeconds.length > 0 ? `${confidentSeconds.length} frames` : "None detected"}
          </div>
          <div className="et-card-label">Confident Moments</div>
          {confidentSeconds.length > 0 && (
            <div className="et-timestamps">
              {confidentSeconds.slice(0, 5).map((s) => (
                <span key={s} className="et-chip et-chip-confident">{formatTime(s)}</span>
              ))}
              {confidentSeconds.length > 5 && (
                <span className="et-chip-more">+{confidentSeconds.length - 5} more</span>
              )}
            </div>
          )}
        </div>

        {/* Eye Contact Card */}
        <div className="et-card">
          <div className="et-card-emoji">👁️</div>
          <div className="et-card-value" style={{ color: EYE_CONTACT_COLOR[eyeContactRating] }}>
            {eyeContactPercent !== null ? `${eyeContactPercent}%` : "N/A"}
          </div>
          <div className="et-card-label">Eye Contact</div>
          <div className="et-eye-badge" style={{ background: `${EYE_CONTACT_COLOR[eyeContactRating]}22`, color: EYE_CONTACT_COLOR[eyeContactRating] }}>
            {EYE_CONTACT_LABEL[eyeContactRating]}
          </div>
          {lookingAwaySeconds.length > 0 && (
            <div className="et-timestamps" style={{ marginTop: 8 }}>
              {lookingAwaySeconds.slice(0, 4).map((s) => (
                <span key={s} className="et-chip et-chip-away">{formatTime(s)}</span>
              ))}
              {lookingAwaySeconds.length > 4 && (
                <span className="et-chip-more">+{lookingAwaySeconds.length - 4} more</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Horizontal timeline bar ────────────────────────────────────── */}
      <div className="et-section">
        <h3 className="et-section-title">Emotion Over Time</h3>
        <div className="et-bar-wrap" title="Each segment = one analyzed frame">
          {timeline.map((frame, i) => (
            <div
              key={i}
              className="et-bar-seg"
              style={{
                background: EMOTION_COLORS[frame.emotion] || "#475569",
                flex: 1,
              }}
              title={`${formatTime(frame.second)} — ${EMOTION_LABELS[frame.emotion] || frame.emotion} (${Math.round(frame.confidence * 100)}%)`}
            />
          ))}
        </div>
        <div className="et-bar-labels">
          <span>{formatTime(timeline[0]?.second ?? 0)}</span>
          <span>{formatTime(timeline[Math.floor(timeline.length / 2)]?.second ?? 0)}</span>
          <span>{formatTime(timeline[timeline.length - 1]?.second ?? 0)}</span>
        </div>
      </div>

      {/* ── Emotion breakdown bar chart ────────────────────────────────── */}
      <div className="et-section">
        <h3 className="et-section-title">Emotion Breakdown</h3>
        <div className="et-breakdown">
          {emotionEntries.map(([emotion, count]) => {
            const pct = Math.round((count / totalFrames) * 100);
            return (
              <div key={emotion} className="et-row">
                <div className="et-row-label">
                  <span>{EMOTION_EMOJI[emotion]}</span>
                  <span>{EMOTION_LABELS[emotion] || emotion}</span>
                </div>
                <div className="et-row-bar-wrap">
                  <div
                    className="et-row-bar"
                    style={{
                      width: `${pct}%`,
                      background: EMOTION_COLORS[emotion] || "#475569",
                    }}
                  />
                </div>
                <div className="et-row-pct">{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Eye Contact section ──────────────────────────────────────────── */}
      {eyeContactPercent !== null && (
        <div className="et-section">
          <h3 className="et-section-title">👁️ Eye Contact</h3>
          <div className="et-eye-bar-wrap">
            <div
              className="et-eye-bar-fill"
              style={{
                width: `${eyeContactPercent}%`,
                background: EYE_CONTACT_COLOR[eyeContactRating],
              }}
            />
          </div>
          <div className="et-eye-bar-labels">
            <span style={{ color: EYE_CONTACT_COLOR[eyeContactRating], fontWeight: 600 }}>
              {eyeContactPercent}% direct eye contact
            </span>
            {lookingAwaySeconds.length > 0 && (
              <span style={{ color: "#64748b", fontSize: "0.78rem" }}>
                Looked away at: {lookingAwaySeconds.slice(0, 6).map(formatTime).join(", ")}
                {lookingAwaySeconds.length > 6 && ` +${lookingAwaySeconds.length - 6} more`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Coaching insight ─────────────────────────────────────────────── */}
      <div className="et-insight">
        {(eyeContactRating === "needs_work" || eyeContactRating === "poor") ? (
          <>
            <span className="et-insight-icon">💡</span>
            <span>
              Your eye contact was <strong>{eyeContactPercent}%</strong> — below the recommended 70%+.
              Practice looking directly into the camera lens, not at your own face on screen.
              {lookingAwaySeconds.length > 0 && ` You looked away most at ${lookingAwaySeconds.slice(0, 3).map(formatTime).join(", ")}.`}
            </span>
          </>
        ) : nervousSeconds.length > confidentSeconds.length ? (
          <>
            <span className="et-insight-icon">💡</span>
            <span>
              You appeared <strong>nervous or anxious in {nervousSeconds.length} frames</strong>.
              Try practicing slower breathing and maintaining eye contact with the camera
              during the first 30 seconds — that&apos;s when nerves show most.
            </span>
          </>
        ) : confidentSeconds.length > 0 ? (
          <>
            <span className="et-insight-icon">✅</span>
            <span>
              Great job! You projected <strong>confidence in {confidentSeconds.length} frames</strong>
              {eyeContactRating === "excellent" && ` with excellent eye contact (${eyeContactPercent}%)`}.
              Keep that positive energy throughout your entire presentation.
            </span>
          </>
        ) : (
          <>
            <span className="et-insight-icon">ℹ️</span>
            <span>
              Your facial expressions appeared <strong>neutral</strong> throughout.
              Try to show more enthusiasm — it makes you appear more engaging to the audience.
            </span>
          </>
        )}
      </div>

      <style>{`
        .et-root { display: flex; flex-direction: column; gap: 24px; }
        .et-empty {
          text-align: center; padding: 40px; color: #64748b;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
        }
        .et-empty span { font-size: 2.5rem; }
        .et-empty p { margin: 0; }
        .et-hint { font-size: 0.8rem; color: #475569; }

        .et-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
        .et-card {
          background: #1e293b; border-radius: 12px; padding: 16px;
          text-align: center; border: 1px solid #2d3748;
        }
        .et-card-emoji { font-size: 1.8rem; margin-bottom: 6px; }
        .et-card-value { font-size: 1rem; font-weight: 600; margin-bottom: 4px; }
        .et-card-label { font-size: 0.75rem; color: #64748b; margin-bottom: 8px; }
        .et-timestamps { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; }
        .et-chip {
          font-size: 0.7rem; padding: 2px 7px; border-radius: 9999px; font-family: monospace;
        }
        .et-chip-nervous  { background: rgba(249,115,22,0.15); color: #f97316; }
        .et-chip-confident { background: rgba(34,197,94,0.15); color: #22c55e; }
        .et-chip-more { font-size: 0.7rem; color: #64748b; align-self: center; }

        .et-section { }
        .et-section-title { font-size: 0.85rem; font-weight: 600; color: #94a3b8; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em; }

        .et-bar-wrap { display: flex; height: 24px; border-radius: 6px; overflow: hidden; gap: 1px; }
        .et-bar-seg { min-width: 2px; cursor: default; transition: opacity 0.15s; }
        .et-bar-seg:hover { opacity: 0.75; }
        .et-bar-labels { display: flex; justify-content: space-between; font-size: 0.7rem; color: #475569; margin-top: 4px; font-family: monospace; }

        .et-breakdown { display: flex; flex-direction: column; gap: 8px; }
        .et-row { display: grid; grid-template-columns: 130px 1fr 44px; align-items: center; gap: 10px; }
        .et-row-label { display: flex; gap: 6px; align-items: center; font-size: 0.85rem; color: #cbd5e1; }
        .et-row-bar-wrap { background: #1e293b; border-radius: 4px; height: 10px; overflow: hidden; }
        .et-row-bar { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
        .et-row-pct { font-size: 0.75rem; color: #94a3b8; text-align: right; }

        .et-chip-away { background: rgba(99,102,241,0.15); color: #818cf8; }

        .et-eye-badge {
          display: inline-block; font-size: 0.72rem; font-weight: 600;
          padding: 3px 10px; border-radius: 9999px; margin-top: 6px;
        }
        .et-eye-bar-wrap {
          height: 12px; background: #1e293b; border-radius: 6px;
          overflow: hidden; margin-bottom: 8px;
        }
        .et-eye-bar-fill { height: 100%; border-radius: 6px; transition: width 0.6s ease; }
        .et-eye-bar-labels {
          display: flex; flex-direction: column; gap: 4px;
          font-size: 0.82rem;
        }

        .et-insight {
          background: #1e293b; border-left: 3px solid #6366f1;
          border-radius: 0 10px 10px 0; padding: 14px 16px;
          display: flex; gap: 10px; align-items: flex-start;
          font-size: 0.875rem; color: #cbd5e1; line-height: 1.5;
        }
        .et-insight-icon { font-size: 1.1rem; flex-shrink: 0; }
      `}</style>
    </div>
  );
};

export default EmotionTimeline;
