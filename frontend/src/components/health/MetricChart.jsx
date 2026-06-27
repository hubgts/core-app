import { useMemo, useState } from 'react';
import { RAW_COLOR, GOAL_COLOR, metricMeta } from './constants';

const W = 760;
const H = 320;
const PAD = { top: 18, right: 18, bottom: 30, left: 46 };

const MONTHS_SHORT = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jui', 'aoû', 'sep', 'oct', 'nov', 'déc'];

const dayNum = (d) => {
  const [y, m, day] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, day) / 86_400_000;
};
const frMonth = (d) => MONTHS_SHORT[Number(d.split('-')[1]) - 1];

// Lissage doux (tangentes plates) passant par chaque point — comme NetWorthChart.
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
 * Courbe d'une métrique : points bruts + tendance lissée, avec, en option,
 * une ligne d'objectif (hex, pas var()) et un point ETA projeté.
 *
 * `data`    : [{ date, value, trend }] trié par date croissante.
 * `goal`    : { target, eta } | null  (eta = { date, value } facultatif).
 * `color`   : couleur de la tendance (hex).
 */
export default function MetricChart({ data, metricKey, color, goal, label, onPointClick }) {
  const meta = metricMeta(metricKey);
  const [hover, setHover] = useState(null); // index du point survolé

  const layout = useMemo(() => {
    const points = (data ?? []).map((d) => ({
      date: d.date,
      value: Number(d.value),
      trend: Number(d.trend),
    }));
    if (points.length === 0) return null;

    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;

    // Domaine X temporel (jours), étendu jusqu'à l'ETA s'il existe.
    let xMin = dayNum(points[0].date);
    let xMax = dayNum(points[points.length - 1].date);
    if (goal?.eta?.date) xMax = Math.max(xMax, dayNum(goal.eta.date));
    if (xMin === xMax) xMax = xMin + 1;

    // Domaine Y : valeurs brutes + tendance (+ cible) avec marge.
    const vals = [];
    points.forEach((p) => {
      vals.push(p.value, p.trend);
    });
    if (goal?.target != null) vals.push(goal.target);
    let yMin = Math.min(...vals);
    let yMax = Math.max(...vals);
    const margin = (yMax - yMin) * 0.12 || 1;
    yMin -= margin;
    yMax += margin;

    const xAt = (d) => PAD.left + ((dayNum(d) - xMin) / (xMax - xMin)) * plotW;
    const yAt = (v) => PAD.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

    const rawPts = points.map((p) => ({ ...p, x: xAt(p.date), y: yAt(p.value) }));
    const trendPts = points.map((p) => ({ x: xAt(p.date), y: yAt(p.trend) }));

    // Graduations Y (~4).
    const ticks = [];
    for (let i = 0; i <= 4; i += 1) ticks.push(yMin + ((yMax - yMin) * i) / 4);

    // Labels de mois (changement de mois).
    const xlabels = [];
    let lastMonth = '';
    points.forEach((p) => {
      const mk = p.date.slice(0, 7);
      if (mk !== lastMonth) {
        xlabels.push({ x: xAt(p.date), label: frMonth(p.date) });
        lastMonth = mk;
      }
    });

    // Bande de tendance : ±0,8 % autour de la tendance (ombrage léger).
    const bandUp = trendPts.map((p, i) => ({ x: p.x, y: yAt(points[i].trend * 1.008) }));
    const bandDown = trendPts.map((p, i) => ({ x: p.x, y: yAt(points[i].trend * 0.992) }));
    const bandPath = `${smoothPath(bandUp)} L ${bandDown[bandDown.length - 1].x} ${bandDown[bandDown.length - 1].y} ${smoothPath([...bandDown].reverse()).replace('M', 'L')} Z`;

    // Segment de projection jusqu'à l'ETA.
    let etaSeg = null;
    if (goal?.eta?.date && goal.eta.value != null) {
      const lastTrend = trendPts[trendPts.length - 1];
      etaSeg = {
        x1: lastTrend.x,
        y1: lastTrend.y,
        x2: xAt(goal.eta.date),
        y2: yAt(goal.eta.value),
      };
    }

    return {
      rawPts,
      trendPath: smoothPath(trendPts),
      bandPath,
      ticks,
      yAt,
      xlabels,
      goalY: goal?.target != null ? yAt(goal.target) : null,
      etaSeg,
    };
  }, [data, goal]);

  if (!layout) {
    return (
      <div className="hchart">
        <svg className="hchart__svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
          <text className="hchart__empty" x={W / 2} y={H / 2}>
            Pas encore de données sur cette période.
          </text>
        </svg>
      </div>
    );
  }

  const { rawPts, trendPath, bandPath, ticks, yAt, xlabels, goalY, etaSeg } = layout;
  const gid = `hchart-band-${metricKey}`;

  return (
    <div className="hchart">
      <svg
        className="hchart__svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={label}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grille + axes Y */}
        {ticks.map((v, i) => (
          <g key={i}>
            <line className="hchart__gridline" x1={PAD.left} x2={W - PAD.right} y1={yAt(v)} y2={yAt(v)} />
            <text className="hchart__ylabel" x={PAD.left - 8} y={yAt(v) + 4}>
              {v.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
            </text>
          </g>
        ))}

        {/* Bande de tendance */}
        <path className="hchart__band" d={bandPath} fill={`url(#${gid})`} />

        {/* Ligne d'objectif (pointillés) + libellé */}
        {goalY != null && (
          <>
            <line
              className="hchart__goal"
              x1={PAD.left}
              x2={W - PAD.right}
              y1={goalY}
              y2={goalY}
              stroke={GOAL_COLOR}
            />
            <text className="hchart__goallabel" x={W - PAD.right} y={goalY - 6} fill={GOAL_COLOR}>
              🎯 objectif
            </text>
          </>
        )}

        {/* Projection jusqu'à l'ETA */}
        {etaSeg && (
          <>
            <line
              className="hchart__projection"
              x1={etaSeg.x1}
              y1={etaSeg.y1}
              x2={etaSeg.x2}
              y2={etaSeg.y2}
              stroke={color}
            />
            <circle className="hchart__etadot" cx={etaSeg.x2} cy={etaSeg.y2} r={5} fill={GOAL_COLOR} />
          </>
        )}

        {/* Tendance lissée (la lecture de référence) */}
        <path className="hchart__trend" d={trendPath} stroke={color} />

        {/* Points bruts */}
        {rawPts.map((p, i) => (
          <circle
            key={i}
            className={`hchart__raw${hover === i ? ' hchart__raw--hover' : ''}`}
            cx={p.x}
            cy={p.y}
            r={hover === i ? 5 : 3.2}
            fill={RAW_COLOR}
            style={onPointClick ? { cursor: 'pointer' } : undefined}
            onMouseEnter={() => setHover(i)}
            onClick={onPointClick ? () => onPointClick(p.date) : undefined}
          >
            <title>
              {`${p.date} · ${p.value} ${meta.unit} (tendance ${p.trend} ${meta.unit})`}
            </title>
          </circle>
        ))}

        {/* Tooltip survol */}
        {hover != null && rawPts[hover] && (
          <g transform={`translate(${rawPts[hover].x}, ${rawPts[hover].y})`}>
            <g transform="translate(0, -14)">
              <rect className="hchart__tip" x={-58} y={-30} width={116} height={26} rx={6} />
              <text className="hchart__tiptext" x={0} y={-12}>
                {`${rawPts[hover].value} ${meta.unit} · t. ${rawPts[hover].trend}`}
              </text>
            </g>
          </g>
        )}

        {/* Labels X */}
        {xlabels.map((l, i) => (
          <text key={i} className="hchart__xlabel" x={l.x} y={H - PAD.bottom + 18}>
            {l.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
