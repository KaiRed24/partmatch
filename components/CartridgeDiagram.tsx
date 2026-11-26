/** Simple ceramic disc cartridge with the A/B/C/D measurements suppliers use. Our own drawing. */
export default function CartridgeDiagram({ highlight, className = "" }: { highlight?: "A" | "B" | "C" | "D"; className?: string }) {
  const tone = (k: string) => (highlight === k ? "#009edb" : "#64748b");
  const weight = (k: string) => (highlight === k ? 700 : 500);
  return (
    <svg viewBox="0 0 220 260" className={className} role="img" aria-label="Cartridge measurements A (overall length), B, C and D (spline length)">
      <g fill="#e2e8f0" stroke="#334155" strokeWidth="2">
        {/* spline */}
        <rect x="92" y="20" width="26" height="40" rx="2" />
        {[26, 32, 38, 44, 50].map((y) => (
          <line key={y} x1="92" x2="118" y1={y} y2={y} strokeWidth="1" />
        ))}
        {/* collar / thread */}
        <rect x="80" y="60" width="50" height="40" rx="3" />
        {[66, 72, 78, 84, 90].map((y) => (
          <line key={y} x1="80" x2="130" y1={y} y2={y} strokeWidth="1" />
        ))}
        {/* hex */}
        <path d="M66 100h78l6 12v14l-6 12H66l-6-12v-14z" />
        {/* body */}
        <rect x="74" y="138" width="62" height="90" rx="4" />
        <rect x="80" y="228" width="50" height="10" rx="2" fill="#94a3b8" />
      </g>
      {/* A: overall */}
      <g stroke={tone("A")} fill={tone("A")} fontSize="14" fontWeight={weight("A")}>
        <line x1="30" x2="30" y1="20" y2="238" strokeWidth="1.5" />
        <line x1="24" x2="36" y1="20" y2="20" /><line x1="24" x2="36" y1="238" y2="238" />
        <text x="12" y="134" stroke="none">A</text>
      </g>
      {/* B: top of hex to bottom */}
      <g stroke={tone("B")} fill={tone("B")} fontSize="14" fontWeight={weight("B")}>
        <line x1="170" x2="170" y1="100" y2="238" strokeWidth="1.5" />
        <line x1="164" x2="176" y1="100" y2="100" /><line x1="164" x2="176" y1="238" y2="238" />
        <text x="178" y="174" stroke="none">B</text>
      </g>
      {/* C: spline + collar */}
      <g stroke={tone("C")} fill={tone("C")} fontSize="14" fontWeight={weight("C")}>
        <line x1="150" x2="150" y1="20" y2="100" strokeWidth="1.5" />
        <line x1="144" x2="156" y1="20" y2="20" /><line x1="144" x2="156" y1="100" y2="100" />
        <text x="158" y="64" stroke="none">C</text>
      </g>
      {/* D: spline */}
      <g stroke={tone("D")} fill={tone("D")} fontSize="14" fontWeight={weight("D")}>
        <line x1="60" x2="60" y1="20" y2="60" strokeWidth="1.5" />
        <line x1="54" x2="66" y1="20" y2="20" /><line x1="54" x2="66" y1="60" y2="60" />
        <text x="44" y="45" stroke="none">D</text>
      </g>
    </svg>
  );
}
