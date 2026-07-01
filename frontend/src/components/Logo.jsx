/**
 * Logo Core — un « C » monogramme : arc ouvert (les modules, la donnée) qui
 * s'enroule autour d'un noyau ambré (le point unique, soi). L'ouverture du C
 * pointe vers le noyau : tout converge vers le centre.
 * Dégradé ciel → ambre, sur tuile nuit.
 *
 * @param {number}  size     Taille en px (carré).
 * @param {boolean} withTile Affiche la tuile nuit en fond (false = motif seul).
 */
export default function Logo({ size = 34, withTile = true }) {
  // Arc « C » ouvert à droite (l'ouverture regarde le noyau central).
  // Cercle de rayon 8 centré en (16,16), tracé de ~55° à ~-55° (sens horaire
  // par le haut-gauche-bas), laissant une échancrure côté droit.
  const cx = 16;
  const cy = 16;
  const r = 8.4;
  const a0 = (58 * Math.PI) / 180; // extrémité haute
  const a1 = (-58 * Math.PI) / 180; // extrémité basse
  const p0 = { x: cx + r * Math.cos(a0), y: cy - r * Math.sin(a0) };
  const p1 = { x: cx + r * Math.cos(a1), y: cy - r * Math.sin(a1) };
  // largeArc=1 pour parcourir le grand arc (haut → gauche → bas).
  const arc = `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${r} ${r} 0 1 0 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;

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

      {/* Arc « C » : la donnée qui s'enroule autour du noyau */}
      <path
        d={arc}
        stroke="url(#core-grad)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Noyau central + halo : le point unique vers lequel le C s'ouvre */}
      <circle cx="16" cy="16" r="5.6" fill="#FBBF24" opacity="0.16" />
      <circle cx="16" cy="16" r="3.1" fill="#FBBF24" />
    </svg>
  );
}
