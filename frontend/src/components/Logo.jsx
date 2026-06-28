/**
 * Logo Core — un cœur central auquel se rattachent les modules de la vie.
 * Dégradé ciel → ambre (la donnée qui converge vers un point unique).
 *
 * @param {number}  size     Taille en px (carré).
 * @param {boolean} withTile Affiche la tuile nuit en fond (false = motif seul).
 */
export default function Logo({ size = 34, withTile = true }) {
  // Quatre modules en orbite, reliés au noyau central.
  const nodes = [
    { x: 16, y: 6.5 },
    { x: 25.5, y: 16 },
    { x: 16, y: 25.5 },
    { x: 6.5, y: 16 },
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Core"
    >
      <defs>
        <linearGradient
          id="core-grad"
          x1="6"
          y1="26"
          x2="26"
          y2="6"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#38BDF8" />
          <stop offset="1" stopColor="#FBBF24" />
        </linearGradient>
      </defs>

      {withTile && <rect width="32" height="32" rx="9" fill="#15233B" />}

      {/* Rayons : chaque module relié au noyau */}
      {nodes.map((n, i) => (
        <line
          key={`l${i}`}
          x1="16"
          y1="16"
          x2={n.x}
          y2={n.y}
          stroke="url(#core-grad)"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.85"
        />
      ))}

      {/* Modules en orbite */}
      {nodes.map((n, i) => (
        <circle
          key={`n${i}`}
          cx={n.x}
          cy={n.y}
          r="2.3"
          fill="url(#core-grad)"
        />
      ))}

      {/* Noyau central + halo */}
      <circle cx="16" cy="16" r="6" fill="#FBBF24" opacity="0.16" />
      <circle cx="16" cy="16" r="3.6" fill="url(#core-grad)" />
    </svg>
  );
}
