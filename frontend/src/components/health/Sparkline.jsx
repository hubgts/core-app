import { useMemo } from 'react';

const W = 120;
const H = 36;
const PAD = 4;

const dayNum = (d) => {
  const [y, m, day] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, day) / 86_400_000;
};

/** Mini-courbe de la tendance d'une métrique (clic → métrique en grand). */
export default function Sparkline({ data, color }) {
  const path = useMemo(() => {
    const pts = (data ?? []).map((d) => ({ x: dayNum(d.date), y: Number(d.trend) }));
    if (pts.length < 2) return null;
    const xMin = pts[0].x;
    const xMax = pts[pts.length - 1].x || xMin + 1;
    const ys = pts.map((p) => p.y);
    let yMin = Math.min(...ys);
    let yMax = Math.max(...ys);
    if (yMin === yMax) yMax = yMin + 1;
    const X = (x) => PAD + ((x - xMin) / (xMax - xMin)) * (W - 2 * PAD);
    const Y = (y) => H - PAD - ((y - yMin) / (yMax - yMin)) * (H - 2 * PAD);
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' ');
  }, [data]);

  if (!path) {
    return <div className="hspark hspark--empty">—</div>;
  }
  return (
    <svg className="hspark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
