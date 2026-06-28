import { formatEur } from './constants';

// Couleurs concrètes (le SVG ne résout pas var(--…)).
const IN = '#34d399';
const OUT = '#f87171';
const GRID = '#334155';

/**
 * Histogramme entrées vs sorties sur quelques mois.
 * `data` = [{ month:'YYYY-MM', income, expenses, net }] (du plus ancien au récent).
 * `current` = mois courant à mettre en évidence.
 */
export default function CashflowChart({ data, current }) {
  const rows = data ?? [];
  const max = Math.max(1, ...rows.map((d) => Math.max(d.income, d.expenses)));

  const W = 560;
  const H = 200;
  const PAD_B = 26; // place pour les libellés de mois
  const PAD_T = 8;
  const plot = H - PAD_B - PAD_T;
  const baseY = PAD_T + plot; // ligne de base (0 €)
  const slot = W / rows.length;
  const barW = Math.min(26, slot / 3);
  const y = (v) => PAD_T + plot * (1 - v / max);

  return (
    <div className="bcf">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="bcf__svg"
        role="img"
        aria-label="Entrées et sorties par mois"
      >
        {/* Ligne de base */}
        <line
          x1="0"
          y1={baseY}
          x2={W}
          y2={baseY}
          stroke={GRID}
          strokeWidth="1"
        />
        {rows.map((d, i) => {
          const cx = i * slot + slot / 2;
          const isCur = d.month === current;
          const bars = [
            { x: cx - barW - 1, v: d.income, fill: IN, lbl: 'entrées' },
            { x: cx + 1, v: d.expenses, fill: OUT, lbl: 'sorties' },
          ];
          return (
            <g key={d.month}>
              {bars.map((b) => (
                <rect
                  key={b.lbl}
                  x={b.x}
                  y={y(b.v)}
                  width={barW}
                  height={baseY - y(b.v)}
                  rx="3"
                  fill={b.fill}
                  opacity={isCur ? 1 : 0.55}
                >
                  <title>{`${d.month} · ${b.lbl} ${formatEur(b.v)}`}</title>
                </rect>
              ))}
              <text
                x={cx}
                y={H - 8}
                textAnchor="middle"
                className={`bcf__xlabel${isCur ? ' bcf__xlabel--cur' : ''}`}
              >
                {d.month.slice(5)}/{d.month.slice(2, 4)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="bcf__legend">
        <span>
          <span className="bcf__dot" style={{ background: IN }} /> Entrées
        </span>
        <span>
          <span className="bcf__dot" style={{ background: OUT }} /> Sorties
        </span>
      </div>
    </div>
  );
}
