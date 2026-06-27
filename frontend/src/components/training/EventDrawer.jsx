import { useEffect } from 'react';
import { frenchFullDate } from '../../utils/date';
import { formatDuration } from '../../utils/format';
import { CARDIO_ZONES, TYPE_META, tonnageOf } from './constants';

export default function EventDrawer({ event, onEdit, onDelete, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const meta = TYPE_META[event.type];
  const duration = formatDuration(event.durationMin);
  const zone = CARDIO_ZONES.find((z) => z.id === event.zone);

  return (
    <div className="drawer-overlay" onMouseDown={onClose}>
      <aside className="drawer" onMouseDown={(e) => e.stopPropagation()}>
        <header className="drawer__head" style={{ '--c': meta.color }}>
          <span className="drawer__icon">{meta.icon}</span>
          <div>
            <h2 className="drawer__title">{meta.label}</h2>
            <p className="drawer__date">{frenchFullDate(event.date)}</p>
          </div>
          <button className="drawer__close" onClick={onClose} aria-label="Fermer">✕</button>
        </header>

        {event.programLabel && (
          <div className="drawer__program">
            <span className="drawer__program-badge">🗓 Programme</span>
            <span className="drawer__program-name">{event.programLabel}</span>
            {event.programObjective && (
              <span className="drawer__program-obj">Objectif : {event.programObjective}</span>
            )}
          </div>
        )}

        <div className="drawer__meta">
          {event.startTime ? (
            <span className="drawer__badge">🕒 {event.startTime}</span>
          ) : (
            <span className="drawer__badge drawer__badge--day">Journée</span>
          )}
          {duration && <span className="drawer__badge">⏱ {duration}</span>}
          {event.feeling != null && <span className="drawer__badge">Ressenti {event.feeling}/5</span>}
        </div>

        <div className="drawer__body">
          {event.type === 'musculation' && (
            <>
              {event.exercises.map((ex) => (
                <div key={ex.id} className="drawer__exo">
                  <div className="drawer__exoname">{ex.name}</div>
                  <ul className="drawer__sets">
                    {ex.sets.map((s, i) => (
                      <li key={s.id}>
                        Série {i + 1} : <strong>{s.reps}</strong> × <strong>{s.weight} kg</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="drawer__tonnage">
                Tonnage de la séance : <strong>{tonnageOf(event).toLocaleString('fr-FR')} kg</strong>
              </div>
            </>
          )}

          {event.type === 'cardio' && (
            <>
              {zone && (
                <p className="drawer__line">
                  <span className="drawer__k">Zone</span>
                  <span>{zone.id} — {zone.label} ({zone.pct})</span>
                </p>
              )}
              {event.description && <p className="drawer__desc">{event.description}</p>}
              {!zone && !event.description && <p className="muted">Pas de détail.</p>}
            </>
          )}

          {event.type === 'autre' && (
            <>
              <p className="drawer__line">
                <span className="drawer__k">Titre</span>
                <span>{event.title}</span>
              </p>
              {event.description && <p className="drawer__desc">{event.description}</p>}
            </>
          )}
        </div>

        <footer className="drawer__actions">
          <button className="btn btn--danger" onClick={() => onDelete(event)}>Supprimer</button>
          <button className="btn btn--primary" onClick={() => onEdit(event)}>Éditer</button>
        </footer>
      </aside>
    </div>
  );
}
