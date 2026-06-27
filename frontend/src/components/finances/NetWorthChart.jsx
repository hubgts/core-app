import { useMemo } from 'react';
import { formatEur } from './constants';

const W = 760;
const H = 300;
const PAD = { top: 20, right: 16, bottom: 32, left: 56 };

const MONTHS_SHORT = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jui', 'aoû', 'sep', 'oct', 'nov', 'déc'];

function monthLabel(dateStr) {
  const [, m] = dateStr.split('-').map(Number);
  return MONTHS_SHORT[m - 1];
}

// Lissage doux (tangentes plates) passant par chaque point.
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

/**
 * Courbe d'évolution. `data` = [{ date, net }] (ou { date, amount } via `valueKey`).
 * `projection` (optionnel) = mêmes points pour le **futur** : tracés en pointillé,
 * connectés au dernier point réel, avec un repère « aujourd'hui ».
 * Gère les valeurs négatives avec une ligne de zéro.
 */
export default function NetWorthChart({
  data,
  valueKey = 'net',
  color = '#818cf8',
  label = 'Patrimoine net',
  projection = null,
}) {
  const points = useMemo(
    () => (data ?? []).map((d) => ({ date: d.date, value: Number(d[valueKey] ?? 0) })),
    [data, valueKey],
  );
  const projPoints = useMemo(
    () => (projection ?? []).map((d) => ({ date: d.date, value: Number(d[valueKey] ?? 0) })),
    [projection, valueKey],
  );

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const h = points.length;
  const n = h + projPoints.length;

  if (h === 0) {
    return (
      <div className="fchart">
        <svg className="fchart__svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
          <text className="fchart__empty" x={W / 2} y={H / 2}>Aucune donnée sur la période.</text>
        </svg>
      </div>
    );
  }

  const allValues = [...points, ...projPoints].map((p) => p.value);
  let min = Math.min(0, ...allValues);
  let max = Math.max(0, ...allValues);
  if (min === max) max = min + 1; // évite une division par zéro
  const span = max - min;

  const xAt = (i) => PAD.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yAt = (v) => PAD.top + plotH - ((v - min) / span) * plotH;

  const linePts = points.map((p, i) => ({ x: xAt(i), y: yAt(p.value) }));
  const linePath = smoothPath(linePts);
  // Aire fermée jusqu'à la ligne de zéro (réel uniquement).
  const areaPath = `${linePath} L ${linePts[h - 1].x} ${yAt(0)} L ${linePts[0].x} ${yAt(0)} Z`;

  // Projection : connectée au dernier point réel, tracée en pointillé.
  const projLinePts = projPoints.map((p, i) => ({ x: xAt(h + i), y: yAt(p.value) }));
  const projPathPts = projLinePts.length ? [linePts[h - 1], ...projLinePts] : [];
  const projPath = smoothPath(projPathPts);

  // Graduations Y (~4).
  const ticks = [];
  const stepCount = 4;
  for (let i = 0; i <= stepCount; i += 1) ticks.push(min + (span * i) / stepCount);

  const labelEvery = Math.ceil(n / 12);
  const gid = `fchart-grad-${valueKey}`;

  return (
    <div className="fchart">
      <svg className="fchart__svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((v, i) => (
          <g key={i}>
            <line className="fchart__gridline" x1={PAD.left} x2={W - PAD.right} y1={yAt(v)} y2={yAt(v)} />
            <text className="fchart__ylabel" x={PAD.left - 8} y={yAt(v) + 4}>
              {formatEur(Math.round(v))}
            </text>
          </g>
        ))}

        {min < 0 && (
          <line className="fchart__zero" x1={PAD.left} x2={W - PAD.right} y1={yAt(0)} y2={yAt(0)} />
        )}

        <path className="fchart__area" d={areaPath} fill={`url(#${gid})`} />
        <path className="fchart__line" d={linePath} stroke={color} />

        {/* Projection : repère « aujourd'hui » + ligne pointillée */}
        {projLinePts.length > 0 && (
          <>
            <line
              className="fchart__now"
              x1={linePts[h - 1].x}
              x2={linePts[h - 1].x}
              y1={PAD.top}
              y2={PAD.top + plotH}
            />
            <text className="fchart__nowlabel" x={linePts[h - 1].x + 4} y={PAD.top + 10}>
              auj.
            </text>
            <path
              className="fchart__line fchart__line--proj"
              d={projPath}
              stroke={color}
              strokeDasharray="5 5"
            />
            <circle
              className="fchart__dot"
              cx={projLinePts[projLinePts.length - 1].x}
              cy={projLinePts[projLinePts.length - 1].y}
              r={3.5}
              fill={color}
              opacity="0.7"
            >
              <title>{`${projPoints[projPoints.length - 1].date} · ${formatEur(projPoints[projPoints.length - 1].value)} (projeté)`}</title>
            </circle>
          </>
        )}

        {linePts.map((p, i) => (
          <circle key={i} className="fchart__dot" cx={p.x} cy={p.y} r={3} fill={color}>
            <title>{`${points[i].date} · ${formatEur(points[i].value)}`}</title>
          </circle>
        ))}

        {[...points, ...projPoints].map((p, i) =>
          i % labelEvery === 0 ? (
            <text key={i} className="fchart__xlabel" x={xAt(i)} y={H - PAD.bottom + 18}>
              {monthLabel(p.date)}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}
