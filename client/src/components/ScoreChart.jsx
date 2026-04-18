import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const ScoreChart = ({ sessions = [] }) => {
  const data = [...sessions]
    .reverse()
    .map((s, i) => ({
      name: `#${i + 1}`,
      score: isNaN(s.overallScore) || s.overallScore == null ? 0 : parseFloat(Number(s.overallScore).toFixed(1)),
      scenario: s.context?.scenario || "Session",
    }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px" }}>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 4px" }}>{payload[0]?.payload?.scenario}</p>
        <p style={{ fontSize: 16, fontWeight: 700, color: "var(--brand)", margin: 0 }}>{payload[0]?.value} / 10</p>
      </div>
    );
  };

  if (data.length === 0) {
    return (
      <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 14 }}>
        No sessions yet — start your first coaching session
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 10]} tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={7} stroke="rgba(79,110,247,.3)" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="score"
          stroke="var(--brand)"
          strokeWidth={2.5}
          dot={{ fill: "var(--brand)", r: 5, strokeWidth: 2, stroke: "var(--bg)" }}
          activeDot={{ r: 7, fill: "var(--brand)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ScoreChart;
