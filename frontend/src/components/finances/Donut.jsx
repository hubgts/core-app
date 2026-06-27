import { formatEur } from './constants';

const SIZE = 180;
const R = 70;
const STROKE = 26;
const C = 2 * Math.PI * R;

/**
 * Donut de répartition générique. `slices` = [{ key, label, color, total, pct }]
 * (déjà filtrées/triées côté appelant). `gross` = total affiché au centre.
 */
export default function Donut({ slices, gross, label = 'Répartition des actifs', centerSub = 'actifs' }) {
  const data = (slices ?? []).filter((d) => d.total > 0);

  if (data.length === 0) {
    return <p className="fdonut__empty">Aucun actif à répartir.</p>;
  }

  let offset = 0;
  const arcs = data.map((s) => {
    const frac = s.pct / 100;
    const arc = {
      ...s,
      color: s.color || '#94a3b8',
      dash: C * frac,
      gap: C * (1 - frac),
      // -90° pour démarrer en haut, puis cumul des fractions précédentes.
      rotation: -90 + offset * 360,
    };
    offset += frac;
    return arc;
  });

  return (
    <div className="fdonut">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={label}>
        <g transform={`translate(${SIZE / 2}, ${SIZE / 2})`}>
          <circle r={R} fill="none" stroke="var(--surface-3)" strokeWidth={STROKE} />
          {arcs.map((a) => (
            <circle
              key={a.key}
              r={R}
              fill="none"
              stroke={a.color}
              strokeWidth={STROKE}
              strokeDasharray={`${a.dash} ${a.gap}`}
              transform={`rotate(${a.rotation})`}
            >
              <title>{`${a.label} · ${formatEur(a.total)} (${a.pct} %)`}</title>
            </circle>
          ))}
        </g>
        <text className="fdonut__center" x={SIZE / 2} y={SIZE / 2 - 4}>
          {formatEur(gross)}
        </text>
        <text className="fdonut__centersub" x={SIZE / 2} y={SIZE / 2 + 16}>
          {centerSub}
        </text>
      </svg>

      <ul className="fdonut__legend">
        {arcs.map((a) => (
          <li key={a.key}>
            <span className="fdonut__swatch" style={{ background: a.color }} />
            <span className="fdonut__legendlabel">{a.label}</span>
            <span className="fdonut__legendpct">{a.pct} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
