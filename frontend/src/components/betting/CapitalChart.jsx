import { useMemo } from 'react';
import { formatEur } from './constants';

const W = 760;
const H = 280;
const PAD = { top: 20, right: 16, bottom: 32, left: 60 };

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

function shortDate(dateStr) {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

/** Courbe en escalier du capital de la bankroll. `data` = [{ date, capital }]. */
export default function CapitalChart({ data, color = '#818cf8' }) {
  const points = useMemo(
    () =>
      (data ?? []).map((d) => ({
        date: d.date,
        value: Number(d.capital ?? 0),
      })),
    [data],
  );

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const n = points.length;

  if (n < 2) {
    return (
      <div className="bchart">
        <svg
          className="bchart__svg"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Courbe du capital"
        >
          <text className="bchart__empty" x={W / 2} y={H / 2}>
            Pas assez de données pour tracer la courbe.
          </text>
        </svg>
      </div>
    );
  }

  const values = points.map((p) => p.value);
  let min = Math.min(0, ...values);
  let max = Math.max(...values);
  if (min === max) max = min + 1;
  const span = max - min;

  const xAt = (i) => PAD.left + (i / (n - 1)) * plotW;
  const yAt = (v) => PAD.top + plotH - ((v - min) / span) * plotH;

  const linePts = points.map((p, i) => ({ x: xAt(i), y: yAt(p.value) }));
  // Tracé en escalier (paliers entre paris).
  let linePath = `M ${linePts[0].x} ${linePts[0].y}`;
  for (let i = 1; i < linePts.length; i += 1) {
    linePath += ` L ${linePts[i].x} ${linePts[i - 1].y} L ${linePts[i].x} ${linePts[i].y}`;
  }
  const areaPath = `${linePath} L ${linePts[n - 1].x} ${yAt(min)} L ${linePts[0].x} ${yAt(min)} Z`;

  const ticks = [];
  const stepCount = 4;
  for (let i = 0; i <= stepCount; i += 1)
    ticks.push(min + (span * i) / stepCount);

  const labelEvery = Math.ceil(n / 8);
  const gid = 'bchart-grad';

  return (
    <div className="bchart">
      <svg
        className="bchart__svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Courbe du capital"
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.26" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((v, i) => (
          <g key={i}>
            <line
              className="bchart__gridline"
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yAt(v)}
              y2={yAt(v)}
            />
            <text className="bchart__ylabel" x={PAD.left - 8} y={yAt(v) + 4}>
              {formatEur(Math.round(v), { decimals: 0 })}
            </text>
          </g>
        ))}

        <path className="bchart__area" d={areaPath} fill={`url(#${gid})`} />
        <path className="bchart__line" d={linePath} stroke={color} />

        {linePts.map((p, i) => (
          <circle
            key={i}
            className="bchart__dot"
            cx={p.x}
            cy={p.y}
            r={2.5}
            fill={color}
          >
            <title>{`${points[i].date} · ${formatEur(points[i].value)}`}</title>
          </circle>
        ))}

        {points.map((p, i) =>
          i % labelEvery === 0 ? (
            <text
              key={i}
              className="bchart__xlabel"
              x={xAt(i)}
              y={H - PAD.bottom + 18}
            >
              {shortDate(p.date)}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}
