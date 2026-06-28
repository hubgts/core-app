import {
  PROGRAM_BADGE,
  TYPE_META,
  eventChipLabel,
  sortEvents,
} from './constants';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const dayNum = (date) => Number(date.split('-')[2]);
const monthOf = (date) => Number(date.split('-')[1]);

export default function MonthView({
  gridDates,
  month,
  today,
  eventsByDate,
  onDayCreate,
  onDayOpen,
  onEventClick,
}) {
  return (
    <div className="cal-month">
      <div className="cal-month__head">
        {WEEKDAYS.map((w) => (
          <div key={w} className="cal-month__wd">
            {w}
          </div>
        ))}
      </div>
      <div className="cal-month__grid">
        {gridDates.map((date) => {
          const events = sortEvents(eventsByDate.get(date) ?? []);
          const inMonth = monthOf(date) === month;
          const shown = events.slice(0, 3);
          const extra = events.length - shown.length;
          return (
            <div
              key={date}
              className={`cal-cell${inMonth ? '' : ' is-out'}${date === today ? ' is-today' : ''}`}
              onClick={() => onDayCreate(date)}
              title="Cliquer pour ajouter une séance"
            >
              <div className="cal-cell__num">{dayNum(date)}</div>
              <div className="cal-cell__chips">
                {shown.map((ev) => (
                  <button
                    key={ev.id}
                    className={`ev-chip${ev.programLabel ? ' ev-chip--program' : ''}`}
                    style={{ '--c': TYPE_META[ev.type].color }}
                    title={
                      ev.programLabel
                        ? `Programme : ${ev.programLabel}${ev.programObjective ? ` — ${ev.programObjective}` : ''}`
                        : undefined
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(ev);
                    }}
                  >
                    {ev.programLabel && (
                      <span className="ev-chip__prog" aria-label="Programme">
                        {PROGRAM_BADGE}
                      </span>
                    )}
                    <span className="ev-chip__icon">
                      {TYPE_META[ev.type].icon}
                    </span>
                    {ev.startTime && (
                      <span className="ev-chip__time">{ev.startTime}</span>
                    )}
                    <span className="ev-chip__txt">{eventChipLabel(ev)}</span>
                  </button>
                ))}
                {extra > 0 && (
                  <button
                    className="ev-more"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDayOpen(date);
                    }}
                  >
                    +{extra}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
