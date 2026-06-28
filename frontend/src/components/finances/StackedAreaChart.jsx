import { useMemo } from 'react';
import { TYPE_META, TYPE_ORDER, formatEur } from './constants';

const W = 760;
const H = 300;
const PAD = { top: 20, right: 16, bottom: 32, left: 56 };
const MONTHS_SHORT = [
  'jan',
  'fév',
  'mar',
  'avr',
  'mai',
  'jun',
  'jui',
  'aoû',
  'sep',
  'oct',
  'nov',
  'déc',
];

function monthLabel(dateStr) {
  const [, m] = dateStr.split('-').map(Number);
  return MONTHS_SHORT[m - 1];
}

/**
 * Aires empilées de la composition du patrimoine par type d'actif (#7).
 * `data` = [{ date, especes, compte_courant, epargne, investissement }] (couleurs
 * hex concrètes via TYPE_META, jamais var() — le SVG ne résout pas les variables CSS).
 */
export default function StackedAreaChart({
  data,
  label = 'Composition du patrimoine',
}) {
  const points = data ?? [];
  const n = points.length;

  // Types actifs réellement présents (au moins une valeur > 0 sur la période).
  const types = useMemo(() => {
    const assetTypes = TYPE_ORDER.filter((t) => TYPE_META[t] && t !== 'dette');
    return assetTypes.filter((t) => points.some((p) => Number(p[t] ?? 0) > 0));
  }, [points]);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  if (n === 0 || types.length === 0) {
    return (
      <div className="fchart">
        <svg
          className="fchart__svg"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={label}
        >
          <text className="fchart__empty" x={W / 2} y={H / 2}>
            Aucune donnée sur la période.
          </text>
        </svg>
      </div>
    );
  }

  const totals = points.map((p) =>
    types.reduce((s, t) => s + Number(p[t] ?? 0), 0),
  );
  let max = Math.max(1, ...totals);

  const xAt = (i) => PAD.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yAt = (v) => PAD.top + plotH - (v / max) * plotH;

  // Bandes empilées (du bas vers le haut), en lignes droites (polygones).
  const cum = points.map(() => 0);
  const bands = types.map((t) => {
    const lower = points.map((p, i) => ({ x: xAt(i), y: yAt(cum[i]) }));
    points.forEach((p, i) => {
      cum[i] += Number(p[t] ?? 0);
    });
    const upper = points.map((p, i) => ({ x: xAt(i), y: yAt(cum[i]) }));
    const top = upper.map((pt) => `${pt.x} ${pt.y}`).join(' L ');
    const bottom = lower
      .map((pt) => `${pt.x} ${pt.y}`)
      .reverse()
      .join(' L ');
    return { type: t, d: `M ${top} L ${bottom} Z`, color: TYPE_META[t].color };
  });

  const ticks = [];
  for (let i = 0; i <= 4; i += 1) ticks.push((max * i) / 4);

  const labelEvery = Math.ceil(n / 12);

  return (
    <div className="fchart">
      <svg
        className="fchart__svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={label}
      >
        {ticks.map((v, i) => (
          <g key={i}>
            <line
              className="fchart__gridline"
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yAt(v)}
              y2={yAt(v)}
            />
            <text className="fchart__ylabel" x={PAD.left - 8} y={yAt(v) + 4}>
              {formatEur(Math.round(v))}
            </text>
          </g>
        ))}

        {bands.map((b) => (
          <path
            key={b.type}
            d={b.d}
            fill={b.color}
            fillOpacity="0.55"
            stroke={b.color}
            strokeWidth="1"
          />
        ))}

        {points.map((p, i) =>
          i % labelEvery === 0 ? (
            <text
              key={i}
              className="fchart__xlabel"
              x={xAt(i)}
              y={H - PAD.bottom + 18}
            >
              {monthLabel(p.date)}
            </text>
          ) : null,
        )}
      </svg>

      <ul className="fdonut__legend fchart__legend">
        {types.map((t) => (
          <li key={t}>
            <span
              className="fdonut__swatch"
              style={{ background: TYPE_META[t].color }}
            />
            <span className="fdonut__legendlabel">{TYPE_META[t].label}</span>
            <span className="fdonut__legendpct">
              {formatEur(Number(points[n - 1][t] ?? 0))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
