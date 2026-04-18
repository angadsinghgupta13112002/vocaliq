const ISSUE_LABELS = {
  filler_word:        "Filler word",
  nervousness:        "Nervousness",
  stutter:            "Stutter",
  eye_contact_break:  "Eye contact break",
  monotone:           "Monotone",
  too_fast:           "Too fast",
  too_slow:           "Too slow",
  enthusiasm:         "Enthusiasm ✓",
  professional_tone:  "Professional ✓",
};

const TimestampedTranscript = ({ transcript = [] }) => {
  if (!transcript.length) {
    return <p style={{ color: "var(--muted)", fontSize: 14 }}>No transcript available.</p>;
  }

  return (
    <div>
      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {[
          ["filler_word", "Filler word"],
          ["nervousness", "Nervousness"],
          ["eye_contact_break", "Eye contact"],
          ["enthusiasm", "Strong moment"],
        ].map(([tag, label]) => (
          <span key={tag} className={`issue-tag tag-${tag}`}>{label}</span>
        ))}
      </div>

      <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {transcript.map((seg, i) => {
          const issues = Array.isArray(seg.issues) ? seg.issues : [];
          const isPositive = issues.every(t => t === "enthusiasm" || t === "professional_tone");
          const hasIssues  = issues.length > 0;

          return (
            <div
              key={i}
              className="transcript-row"
              style={{
                borderBottom: i < transcript.length - 1 ? "1px solid var(--border)" : "none",
                background: isPositive ? "rgba(34,197,94,.04)" : undefined,
              }}
            >
              <span className="transcript-time">{seg.start}</span>
              <div className="transcript-body">
                <p className="transcript-text">{seg.text}</p>
                {hasIssues && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: seg.fix ? 6 : 0 }}>
                    {issues.map((tag, j) => (
                      <span key={j} className={`issue-tag tag-${tag}`}>
                        {ISSUE_LABELS[tag] || tag}
                      </span>
                    ))}
                  </div>
                )}
                {seg.fix && (
                  <p className="transcript-fix">{seg.fix}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimestampedTranscript;
