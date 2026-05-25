"use client";

interface ScoreRingProps {
  score: number; // 0–1
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  animate?: boolean;
}

function getScoreColor(pct: number) {
  if (pct >= 70) return { stroke: "#10b981", text: "#059669", bg: "rgba(16,185,129,0.1)" };
  if (pct >= 40) return { stroke: "#f59e0b", text: "#d97706", bg: "rgba(245,158,11,0.1)" };
  return { stroke: "#ef4444", text: "#dc2626", bg: "rgba(239,68,68,0.1)" };
}

export function ScoreRing({
  score,
  size = 72,
  strokeWidth = 5,
  showLabel = true,
}: ScoreRingProps) {
  const pct = Math.round(Math.max(0, Math.min(1, score)) * 100);
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const { stroke, text, bg } = getScoreColor(pct);

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Match score: ${pct}%`}
    >
      {/* Glow background */}
      <div
        className="absolute inset-1 rounded-full blur-sm opacity-40"
        style={{ background: bg }}
      />

      <svg
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)" }}
        className="relative z-10"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          className="text-muted"
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          stroke={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.34,1.56,0.64,1)" }}
        />
      </svg>

      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <span className="text-[11px] font-bold leading-none" style={{ color: text }}>
            {pct}%
          </span>
        </div>
      )}
    </div>
  );
}

export function ScoreRingLarge({
  score,
  size = 120,
  strokeWidth = 8,
}: ScoreRingProps) {
  const pct = Math.round(Math.max(0, Math.min(1, score)) * 100);
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const { stroke, text, bg } = getScoreColor(pct);
  const label = pct >= 70 ? "Great match" : pct >= 40 ? "Decent match" : "Weak match";

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-2 rounded-full blur-md opacity-30"
        style={{ background: bg }}
      />

      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} className="relative z-10">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={strokeWidth}
          stroke="currentColor" className="text-muted" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={strokeWidth}
          stroke={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.34,1.56,0.64,1)" }} />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        <span className="text-2xl font-bold leading-none" style={{ color: text }}>{pct}%</span>
        <span className="text-[10px] font-medium text-muted-foreground mt-1 leading-none">{label}</span>
      </div>
    </div>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const cls =
    pct >= 70 ? "badge-score-high" :
    pct >= 40 ? "badge-score-mid" :
    "badge-score-low";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {pct}%
    </span>
  );
}
