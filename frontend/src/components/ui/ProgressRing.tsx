/** Anneau de progression (SVG). Purement visuel : l'annonce vocale est gérée par le parent. */
export function ProgressRing({ value, size = 160 }: { value: number; size?: number }) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <div className="absolute inset-3 rounded-full bg-lagoon-100/60 blur-xl" aria-hidden />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative -rotate-90" aria-hidden>
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1d7fd1" />
            <stop offset="100%" stopColor="#12ad86" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5eaf2" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display text-4xl font-semibold tabular-nums text-navy-900" aria-hidden>{value}%</span>
    </div>
  );
}
