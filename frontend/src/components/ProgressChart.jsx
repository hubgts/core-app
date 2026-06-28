import { useMemo, useState } from 'react';
import './ProgressChart.css';

const W = 760;
const H = 340;
const PAD = { top: 20, right: 16, bottom: 34, left: 38 };

// Lissage à tangentes plates : la courbe passe par chaque point et reste
// bornée entre deux points consécutifs → jamais décroissante pour un cumul.
function smoothPath(pts) {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const mx = (p0.x + p1.x) / 2;
    d += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

export default function ProgressChart({ habits, checks, columns, periodDays }) {
  const [hidden, setHidden] = useState(() => new Set());

  const series = useMemo(() => {
    const weeks = periodDays / 7;
    return habits.map((h) => {
      const created = h.createdAt.slice(0, 10);
      let cum = 0;
      const values = columns.map((col) => {
        for (const date of col.dates) {
          if (date >= created && checks.has(`${h.id}|${date}`)) cum += 1;
        }
        return cum;
      });
      return {
        id: h.id,
        name: h.name,
        color: h.color,
        values,
        total: cum,
        target: Math.round(h.weeklyTarget * weeks),
      };
    });
  }, [habits, checks, columns, periodDays]);

  const visible = series.filter((s) => !hidden.has(s.id));
  const maxY = Math.max(
    1,
    ...visible.map((s) => s.total),
    ...visible.map((s) => s.target),
  );

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const n = columns.length;
  const xAt = (i) => PAD.left + (n <= 1 ? 0 : (i / (n - 1)) * plotW);
  const yAt = (v) => PAD.top + plotH - (v / maxY) * plotH;

  // Graduations Y (~4).
  const ticks = [];
  const step = Math.max(1, Math.ceil(maxY / 4));
  for (let v = 0; v <= maxY; v += step) ticks.push(v);

  // Labels X clairsemés pour rester lisibles.
  const labelEvery = Math.ceil(n / 12);

  const toggle = (id) =>
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const empty = visible.every((s) => s.total === 0);

  return (
    <div className="chart">
      <svg
        className="chart__svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Courbes de progression cumulée"
      >
        {/* Grille horizontale + axe Y */}
        {ticks.map((v) => (
          <g key={v}>
            <line
              className="chart__gridline"
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yAt(v)}
              y2={yAt(v)}
            />
            <text className="chart__ylabel" x={PAD.left - 8} y={yAt(v) + 4}>
              {v}
            </text>
          </g>
        ))}

        {/* Labels X */}
        {columns.map((col, i) =>
          i % labelEvery === 0 ? (
            <text
              key={i}
              className="chart__xlabel"
              x={xAt(i)}
              y={H - PAD.bottom + 18}
            >
              {col.label}
            </text>
          ) : null,
        )}

        {/* Rythme cible (droite pointillée) + courbe cumulée par habitude */}
        {visible.map((s) => {
          const pts = s.values.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
          return (
            <g key={s.id}>
              <line
                className="chart__target"
                x1={xAt(0)}
                y1={yAt(0)}
                x2={xAt(n - 1)}
                y2={yAt(s.target)}
                stroke={s.color}
              />
              <path
                className="chart__curve"
                d={smoothPath(pts)}
                stroke={s.color}
              />
              {pts.map((p, i) => (
                <circle
                  key={i}
                  className="chart__dot"
                  cx={p.x}
                  cy={p.y}
                  r={3}
                  fill={s.color}
                >
                  <title>{`${s.name} · ${columns[i].label} · ${s.values[i]} cumulées`}</title>
                </circle>
              ))}
            </g>
          );
        })}

        {empty && (
          <text className="chart__empty" x={W / 2} y={H / 2}>
            Aucune coche sur cette période.
          </text>
        )}
      </svg>

      <div className="chart__legend">
        {series.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`chart__legend-item${hidden.has(s.id) ? ' is-off' : ''}`}
            onClick={() => toggle(s.id)}
            title="Afficher / masquer cette courbe"
          >
            <span
              className="chart__legend-swatch"
              style={{ background: s.color }}
            />
            {s.name}
            <span className="chart__legend-meta">
              {s.total}/{s.target}
            </span>
          </button>
        ))}
        <span className="chart__legend-hint">— — rythme cible</span>
      </div>
    </div>
  );
}
