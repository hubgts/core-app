import { useEffect, useState } from 'react';
import { trainingApi } from '../../api/training';
import { frenchFullDate, frenchDayMonth, todayStr } from '../../utils/date';
import { PROGRAM_DAYS, TYPE_META } from './constants';

const dayLabel = (dow) =>
  PROGRAM_DAYS.find((d) => d.value === dow)?.label ?? `J${dow}`;

/**
 * Choisit une date de début, prévisualise le placement des séances
 * (séances ignorées en semaine partielle — RG-05), puis démarre.
 */
export default function StartProgramModal({ program, onStarted, onClose }) {
  const [startDate, setStartDate] = useState(todayStr());
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    const t = setTimeout(() => {
      trainingApi
        .previewProgram(program.id, startDate)
        .then((res) => alive && (setPreview(res), setLoading(false)))
        .catch((e) => alive && (setError(e.message), setLoading(false)));
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [program.id, startDate]);

  async function confirm() {
    setStarting(true);
    setError('');
    try {
      const res = await trainingApi.startProgram(program.id, startDate);
      onStarted(res);
    } catch (e) {
      setError(e.message);
      setStarting(false);
    }
  }

  // Regroupe l'aperçu par semaine du programme.
  const byWeek = new Map();
  for (const s of preview?.sessions ?? []) {
    if (!byWeek.has(s.weekIndex)) byWeek.set(s.weekIndex, []);
    byWeek.get(s.weekIndex).push(s);
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal modal--lg" onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Démarrer « {program.name} »</h2>

        <label className="field">
          <span className="field__label">Date de début</span>
          <input
            type="date"
            className="field__input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span className="muted prog-start__hint">
            {frenchFullDate(startDate)}
          </span>
        </label>

        {error && <p className="modal__error">{error}</p>}

        <div className="prog-start__preview">
          <h3 className="prog-start__previewtitle">Aperçu du placement</h3>
          {loading ? (
            <p className="muted">Calcul…</p>
          ) : !preview || preview.total === 0 ? (
            <p className="muted">Ce programme ne contient aucune séance.</p>
          ) : (
            <>
              {[...byWeek.entries()].map(([weekIndex, sessions]) => (
                <div key={weekIndex} className="prog-start__week">
                  <div className="prog-start__weekhead">S{weekIndex}</div>
                  <ul className="prog-start__list">
                    {sessions.map((s, i) => (
                      <li
                        key={i}
                        className={`prog-start__row${s.skipped ? ' is-skipped' : ''}`}
                      >
                        <span className="prog-start__status">
                          {s.skipped ? '⚠' : '✓'}
                        </span>
                        <span className="prog-start__day">
                          J{s.dayOfWeek} ({dayLabel(s.dayOfWeek)})
                        </span>
                        <span className="prog-start__icon">
                          {TYPE_META[s.type]?.icon}
                        </span>
                        <span className="prog-start__name">
                          {s.label || TYPE_META[s.type]?.label}
                        </span>
                        <span className="prog-start__date">
                          {s.skipped
                            ? 'ignorée (avant le début)'
                            : frenchDayMonth(s.date)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="prog-start__summary">
                <strong>{preview.placed}</strong> séance
                {preview.placed > 1 ? 's' : ''} ajoutée
                {preview.placed > 1 ? 's' : ''} · {preview.skipped} ignorée
                {preview.skipped > 1 ? 's' : ''}.
              </p>
            </>
          )}
        </div>

        <div className="modal__actions">
          <div className="modal__actions-right">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Annuler
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={confirm}
              disabled={starting || loading || !preview || preview.placed === 0}
            >
              {starting ? '…' : 'Confirmer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
