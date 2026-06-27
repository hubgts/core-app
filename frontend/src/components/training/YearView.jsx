import { isoWeekday, monthDates, monthShort } from '../../utils/date';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function intensityClass(count) {
  if (!count) return '';
  if (count === 1) return ' lvl-1';
  if (count === 2) return ' lvl-2';
  return ' lvl-3';
}

export default function YearView({ year, today, eventsByDate, onPickDay }) {
  return (
    <div className="cal-year">
      {MONTHS.map((m) => {
        const dates = monthDates(year, m);
        const lead = isoWeekday(dates[0]);
        return (
          <div key={m} className="cal-year__month">
            <div className="cal-year__label">{monthShort(m)}</div>
            <div className="cal-year__grid">
              {Array.from({ length: lead }).map((_, i) => (
                <span key={`e${i}`} className="cal-year__cell is-empty" />
              ))}
              {dates.map((d) => {
                const count = (eventsByDate.get(d) ?? []).length;
                return (
                  <button
                    key={d}
                    className={`cal-year__cell${intensityClass(count)}${d === today ? ' is-today' : ''}`}
                    onClick={() => onPickDay(d)}
                    title={`${d} · ${count} séance${count > 1 ? 's' : ''}`}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
