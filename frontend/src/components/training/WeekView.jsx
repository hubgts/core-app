import { isoWeekday } from '../../utils/date';
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  PROGRAM_BADGE,
  TYPE_META,
  eventChipLabel,
  startMinutes,
} from './constants';

const HOUR_H = 46; // px par heure
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const dayNum = (date) => Number(date.split('-')[2]);

// Place les évènements horodatés en colonnes pour gérer les chevauchements.
function packLanes(events) {
  const items = events
    .map((ev) => {
      const start = startMinutes(ev);
      const end = start + (ev.durationMin && ev.durationMin > 0 ? ev.durationMin : 60);
      return { ev, start, end };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const laneEnds = [];
  for (const it of items) {
    let lane = laneEnds.findIndex((end) => end <= it.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(it.end);
    } else {
      laneEnds[lane] = it.end;
    }
    it.lane = lane;
  }
  return { items, lanes: Math.max(1, laneEnds.length) };
}

export default function WeekView({ dates, today, eventsByDate, onSlotCreate, onEventClick }) {
  const hours = [];
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h += 1) hours.push(h);
  const bodyHeight = (DAY_END_HOUR - DAY_START_HOUR + 1) * HOUR_H;
  const single = dates.length === 1;

  return (
    <div className={`cal-time${single ? ' cal-time--day' : ''}`}>
      {/* En-tête des jours */}
      <div className="cal-time__head">
        <div className="cal-time__gutter" />
        {dates.map((date) => (
          <div key={date} className={`cal-time__dayhead${date === today ? ' is-today' : ''}`}>
            <span className="cal-time__wd">{WEEKDAYS[isoWeekday(date)]}</span>
            <span className="cal-time__dnum">{dayNum(date)}</span>
          </div>
        ))}
      </div>

      {/* Bandeau « journée » (évènements sans horaire) */}
      <div className="cal-time__allday">
        <div className="cal-time__gutter cal-time__gutter--allday">Journée</div>
        {dates.map((date) => {
          const allDay = (eventsByDate.get(date) ?? []).filter((e) => !e.startTime);
          return (
            <div key={date} className="cal-time__alldaycol">
              {allDay.map((ev) => (
                <button
                  key={ev.id}
                  className={`ev-chip${ev.programLabel ? ' ev-chip--program' : ''}`}
                  style={{ '--c': TYPE_META[ev.type].color }}
                  title={
                    ev.programLabel
                      ? `Programme : ${ev.programLabel}${ev.programObjective ? ` — ${ev.programObjective}` : ''}`
                      : undefined
                  }
                  onClick={() => onEventClick(ev)}
                >
                  {ev.programLabel && (
                    <span className="ev-chip__prog" aria-label="Programme">{PROGRAM_BADGE}</span>
                  )}
                  <span className="ev-chip__icon">{TYPE_META[ev.type].icon}</span>
                  <span className="ev-chip__txt">{eventChipLabel(ev)}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* Grille horaire */}
      <div className="cal-time__body" style={{ height: bodyHeight }}>
        <div className="cal-time__gutter">
          {hours.map((h) => (
            <div key={h} className="cal-time__hour" style={{ height: HOUR_H }}>
              <span>{String(h).padStart(2, '0')}:00</span>
            </div>
          ))}
        </div>

        {dates.map((date) => {
          const timed = (eventsByDate.get(date) ?? []).filter((e) => e.startTime);
          const { items, lanes } = packLanes(timed);
          return (
            <div key={date} className="cal-time__col">
              {/* créneaux cliquables (création) */}
              {hours.map((h) => (
                <div
                  key={h}
                  className="cal-time__slot"
                  style={{ height: HOUR_H }}
                  onClick={() => onSlotCreate(date, `${String(h).padStart(2, '0')}:00`)}
                  title="Cliquer pour ajouter une séance"
                />
              ))}
              {/* blocs horodatés */}
              {items.map(({ ev, start, end, lane }) => {
                const top = ((start - DAY_START_HOUR * 60) / 60) * HOUR_H;
                const height = Math.max(22, ((end - start) / 60) * HOUR_H);
                const width = `calc(${100 / lanes}% - 4px)`;
                const left = `calc(${(lane * 100) / lanes}% + 2px)`;
                return (
                  <button
                    key={ev.id}
                    className="ev-block"
                    style={{ top, height, width, left, '--c': TYPE_META[ev.type].color }}
                    onClick={() => onEventClick(ev)}
                  >
                    <span className="ev-block__time">{ev.startTime}</span>
                    <span className="ev-block__txt">
                      {ev.programLabel && <span className="ev-block__prog">{PROGRAM_BADGE} </span>}
                      {TYPE_META[ev.type].icon} {eventChipLabel(ev)}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
