import { useMemo } from 'react';
import { daysInMonth, isoWeekday, monthDates, monthShort } from '../utils/date';
import './YearHeatmap.css';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function MonthBlock({ habit, checks, year, month, today, onPick }) {
  const dates = monthDates(year, month);
  const lead = isoWeekday(dates[0]);
  const created = habit.createdAt.slice(0, 10);
  const createdFr = created.split('-').reverse().join('/');
  return (
    <button
      type="button"
      className="hm-month"
      onClick={() => onPick(month)}
      title={`Voir ${monthShort(month)} ${year} en détail`}
    >
      {Array.from({ length: lead }).map((_, i) => (
        <span key={`e${i}`} className="hm-cell hm-cell--empty" />
      ))}
      {dates.map((d) => {
        const checked = checks.has(`${habit.id}|${d}`);
        const isPre = d < created; // avant la création de l'habitude
        const isFuture = d > today;
        const cls = checked
          ? 'hm-cell hm-cell--on'
          : isPre
            ? 'hm-cell hm-cell--pre'
            : isFuture
              ? 'hm-cell hm-cell--void'
              : 'hm-cell hm-cell--off';
        const title = isPre
          ? `${habit.name} · ${d} (avant création le ${createdFr})`
          : `${habit.name} · ${d}${checked ? ' · coché' : ''}`;
        return (
          <span
            key={d}
            className={cls}
            style={checked ? { background: habit.color } : undefined}
            title={title}
          />
        );
      })}
    </button>
  );
}

export default function YearHeatmap({
  habits,
  checks,
  year,
  today,
  onPickMonth,
}) {
  const yearPctById = useMemo(() => {
    const pct = new Map();
    for (const habit of habits) {
      const created = habit.createdAt.slice(0, 10);
      let eligibleDays = 0;
      let done = 0;
      for (const m of MONTHS) {
        for (const d of monthDates(year, m)) {
          if (d < created) continue;
          eligibleDays += 1;
          if (checks.has(`${habit.id}|${d}`)) done += 1;
        }
      }
      const expected = (habit.weeklyTarget * eligibleDays) / 7;
      pct.set(
        habit.id,
        expected ? Math.min(100, Math.round((done / expected) * 100)) : 0,
      );
    }
    return pct;
  }, [habits, checks, year]);

  return (
    <div className="heatmap-wrap">
      <div className="heatmap">
        <div className="heatmap__head">
          <div className="heatmap__namecol" />
          {MONTHS.map((m) => (
            <div key={m} className="heatmap__monthlabel">
              {monthShort(m)}
            </div>
          ))}
          <div className="heatmap__pccol">%</div>
        </div>

        {habits.map((h) => (
          <div key={h.id} className="heatmap__row">
            <div
              className="heatmap__namecol heatmap__name"
              style={{ '--accent': h.color }}
            >
              <span className="heatmap__icon">{h.icon}</span>
              <span className="heatmap__hname">{h.name}</span>
            </div>
            {MONTHS.map((m) => (
              <MonthBlock
                key={m}
                habit={h}
                checks={checks}
                year={year}
                month={m}
                today={today}
                onPick={onPickMonth}
              />
            ))}
            <div className="heatmap__pccol heatmap__pct">
              {yearPctById.get(h.id)}%
            </div>
          </div>
        ))}
      </div>
      <p className="heatmap__legend">
        <span className="hm-cell hm-cell--on hm-cell--demo" /> coché
        <span className="hm-cell hm-cell--off hm-cell--demo" /> attendu non
        coché
        <span className="hm-cell hm-cell--pre hm-cell--demo" /> avant création
        <span className="hm-cell hm-cell--void hm-cell--demo" /> futur
        <span className="heatmap__legend-hint">
          · clique un mois pour l’ouvrir
        </span>
      </p>
    </div>
  );
}
