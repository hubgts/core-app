import { useCallback, useEffect, useMemo, useState } from 'react';
import { trainingApi } from '../api/training';
import { confirmDialog } from '../components/dialogs';
import MonthView from '../components/training/MonthView';
import WeekView from '../components/training/WeekView';
import EventDrawer from '../components/training/EventDrawer';
import EventFormModal from '../components/training/EventFormModal';
import {
  addDaysStr,
  frenchDayMonth,
  monthGridDates,
  monthLabel,
  monthYear,
  todayStr,
  weekDatesOf,
  ymd,
} from '../utils/date';
import './TrainingPage.css';
import { toast } from '../components/toast';

const VIEWS = [
  { id: 'week', label: 'Semaine' },
  { id: 'month', label: 'Mois' },
];

export default function TrainingPage() {
  const today = todayStr();
  const [view, setView] = useState('month');
  const [cursor, setCursor] = useState(today); // jour focalisé (YYYY-MM-DD)

  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(null); // évènement consulté
  const [modal, setModal] = useState(null); // { event?, presetDate?, presetTime? }

  const { year, month } = monthYear(cursor);

  // Plage de dates à charger selon la vue.
  const range = useMemo(() => {
    if (view === 'week') {
      const w = weekDatesOf(cursor);
      return { from: w[0], to: w[6] };
    }
    const grid = monthGridDates(year, month);
    return { from: grid[0], to: grid[41] };
  }, [view, cursor, year, month]);

  const load = useCallback(async () => {
    setError('');
    try {
      const list = await trainingApi.events(range.from, range.to);
      setEvents(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const eventsByDate = useMemo(() => {
    const map = new Map();
    for (const ev of events) {
      const arr = map.get(ev.date);
      if (arr) arr.push(ev);
      else map.set(ev.date, [ev]);
    }
    return map;
  }, [events]);

  // --- Navigation ---
  function go(delta) {
    setCursor((c) => {
      if (view === 'week') return addDaysStr(c, delta * 7);
      const { year: y, month: m } = monthYear(c);
      const nm = new Date(y, m - 1 + delta, 1);
      return ymd(nm.getFullYear(), nm.getMonth() + 1, 1);
    });
  }

  const periodLabel = useMemo(() => {
    if (view === 'week') {
      const w = weekDatesOf(cursor);
      return `${frenchDayMonth(w[0])} – ${frenchDayMonth(w[6])} ${w[6].split('-')[0]}`;
    }
    return monthLabel(year, month);
  }, [view, cursor, year, month]);

  // --- Actions ---
  const openCreate = (date, time = null) =>
    setModal({ presetDate: date ?? cursor, presetTime: time });
  const openEvent = (ev) => setDrawer(ev);
  const openDay = (date) => {
    setCursor(date);
    setView('week');
  };

  async function handleSave(payload, id) {
    const res = id
      ? await trainingApi.update(id, payload)
      : await trainingApi.create(payload);
    setModal(null);
    setDrawer(null);
    await load();
    const prs = res?.prs ?? [];
    if (prs.length) {
      const pr = prs[0];
      toast(`🏋️ Nouveau record : ${pr.exerciseName} ${pr.weight} kg !`);
    }
  }

  async function handleDelete(ev) {
    const ok = await confirmDialog({
      message: 'Supprimer cette séance ? Cette action est irréversible.',
      danger: true,
    });
    if (!ok) return;
    await trainingApi.remove(ev.id);
    setModal(null);
    setDrawer(null);
    await load();
  }

  return (
    <div className="training-page">
      <header className="page-head">
        <div>
          <h1 className="page-head__title">Entraînement</h1>
          <p className="page-head__subtitle">
            Logge tes séances et suis ta progression.
          </p>
        </div>
        <button className="btn btn--primary" onClick={() => openCreate(cursor)}>
          + Séance
        </button>
      </header>

      <div className="control-bar">
        <div className="control-bar__nav">
          <button
            className="icon-btn"
            onClick={() => go(-1)}
            aria-label="Précédent"
          >
            ‹
          </button>
          <span className="control-bar__label">{periodLabel}</span>
          <button
            className="icon-btn"
            onClick={() => go(1)}
            aria-label="Suivant"
          >
            ›
          </button>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => setCursor(today)}
          >
            Aujourd’hui
          </button>
        </div>

        <div className="control-bar__switches">
          <div
            className="segmented"
            role="radiogroup"
            aria-label="Vue calendrier"
          >
            {VIEWS.map((v) => (
              <button
                key={v.id}
                role="radio"
                aria-checked={view === v.id}
                className={`segmented__btn${view === v.id ? ' is-active' : ''}`}
                onClick={() => setView(v.id)}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="banner banner--error">{error}</p>}

      {loading ? (
        <p className="muted">Chargement…</p>
      ) : view === 'month' ? (
        <MonthView
          gridDates={monthGridDates(year, month)}
          month={month}
          today={today}
          eventsByDate={eventsByDate}
          onDayCreate={openCreate}
          onDayOpen={openDay}
          onEventClick={openEvent}
        />
      ) : (
        <WeekView
          dates={weekDatesOf(cursor)}
          today={today}
          eventsByDate={eventsByDate}
          onSlotCreate={openCreate}
          onEventClick={openEvent}
        />
      )}

      {drawer && (
        <EventDrawer
          event={drawer}
          onEdit={(ev) => {
            setDrawer(null);
            setModal({ event: ev });
          }}
          onDelete={handleDelete}
          onClose={() => setDrawer(null)}
        />
      )}

      {modal && (
        <EventFormModal
          event={modal.event}
          presetDate={modal.presetDate}
          presetTime={modal.presetTime}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
