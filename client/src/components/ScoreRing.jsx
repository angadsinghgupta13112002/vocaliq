const ScoreRing = ({ score = 0, size = 140 }) => {
  const radius      = 54;
  const circumf     = 2 * Math.PI * radius;
  const pct         = Math.min(Math.max(score / 10, 0), 1);
  const strokeOffset = circumf - pct * circumf;

  const color = score >= 8 ? "#22c55e" : score >= 6 ? "#4f6ef7" : score >= 4 ? "#eab308" : "#ef4444";

  return (
    <div className="score-ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumf}
          strokeDashoffset={strokeOffset}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="score-ring-center">
        <span className="score-ring-value" style={{ color }}>{score.toFixed(1)}</span>
        <span className="score-ring-label">/ 10</span>
      </div>
    </div>
  );
};

export default ScoreRing;
