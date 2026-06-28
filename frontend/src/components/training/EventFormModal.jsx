import { useEffect, useState } from 'react';
import { trainingApi } from '../../api/training';
import { todayStr } from '../../utils/date';
import { CARDIO_ZONES, TYPE_META, TYPES } from './constants';
import ExerciseCombobox from './ExerciseCombobox';

const emptySet = () => ({ reps: '', weight: '' });
const emptyExercise = () => ({ name: '', sets: [emptySet()] });

function initExercises(event) {
  if (event?.type === 'musculation' && event.exercises?.length) {
    return event.exercises.map((ex) => ({
      name: ex.name,
      sets: ex.sets.map((s) => ({
        reps: String(s.reps),
        weight: String(s.weight),
      })),
    }));
  }
  return [emptyExercise()];
}

export default function EventFormModal({
  event,
  presetDate,
  presetTime,
  onSave,
  onDelete,
  onClose,
}) {
  const isEdit = Boolean(event);
  const [type, setType] = useState(event?.type ?? null);

  const [date, setDate] = useState(event?.date ?? presetDate ?? todayStr());
  const [hasTime, setHasTime] = useState(
    Boolean(event?.startTime ?? presetTime),
  );
  const [time, setTime] = useState(event?.startTime ?? presetTime ?? '08:00');
  const [duration, setDuration] = useState(
    event?.durationMin != null ? String(event.durationMin) : '',
  );
  const [feeling, setFeeling] = useState(event?.feeling ?? null);

  const [exercises, setExercises] = useState(() => initExercises(event));
  const [zone, setZone] = useState(event?.zone ?? null);
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // --- Templates (sélection au démarrage d'une création) ---
  const [templates, setTemplates] = useState([]);
  const [tplSearch, setTplSearch] = useState('');
  const [tplLoading, setTplLoading] = useState(true);
  const [pickMode, setPickMode] = useState('template'); // 'template' | 'scratch'

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Charge les templates uniquement à l'étape de choix (création).
  useEffect(() => {
    if (isEdit || type) return undefined;
    let alive = true;
    setTplLoading(true);
    const t = setTimeout(() => {
      trainingApi
        .templates(tplSearch)
        .then((rows) => {
          if (!alive) return;
          setTemplates(rows);
          setTplLoading(false);
        })
        .catch(() => {
          if (!alive) return;
          setTemplates([]);
          setTplLoading(false);
        });
    }, 150);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [isEdit, type, tplSearch]);

  // Pré-remplit le formulaire à partir d'un template choisi.
  function applyTemplate(tpl) {
    setType(tpl.type);
    setDuration(tpl.durationMin != null ? String(tpl.durationMin) : '');
    setFeeling(tpl.feeling ?? null);
    if (tpl.type === 'musculation') {
      setExercises(
        tpl.exercises?.length
          ? tpl.exercises.map((ex) => ({
              name: ex.name,
              sets: ex.sets.length
                ? ex.sets.map((s) => ({
                    reps: String(s.reps),
                    weight: String(s.weight),
                  }))
                : [emptySet()],
            }))
          : [emptyExercise()],
      );
    } else if (tpl.type === 'cardio') {
      setZone(tpl.zone ?? null);
      setDescription(tpl.description ?? '');
    } else if (tpl.type === 'autre') {
      setTitle(tpl.title || tpl.name || '');
      setDescription(tpl.description ?? '');
    }
  }

  // --- musculation : édition des exercices/séries ---
  const updateExercise = (i, patch) =>
    setExercises((prev) =>
      prev.map((ex, idx) => (idx === i ? { ...ex, ...patch } : ex)),
    );
  const updateSet = (ei, si, patch) =>
    setExercises((prev) =>
      prev.map((ex, idx) =>
        idx === ei
          ? {
              ...ex,
              sets: ex.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)),
            }
          : ex,
      ),
    );
  const addSet = (ei) =>
    setExercises((prev) =>
      prev.map((ex, idx) => {
        if (idx !== ei) return ex;
        const last = ex.sets[ex.sets.length - 1] ?? emptySet();
        return { ...ex, sets: [...ex.sets, { ...last }] };
      }),
    );
  const removeSet = (ei, si) =>
    setExercises((prev) =>
      prev.map((ex, idx) =>
        idx === ei ? { ...ex, sets: ex.sets.filter((_, j) => j !== si) } : ex,
      ),
    );
  const addExercise = () => setExercises((prev) => [...prev, emptyExercise()]);
  const removeExercise = (ei) =>
    setExercises((prev) => prev.filter((_, idx) => idx !== ei));

  const liveTonnage = exercises.reduce(
    (t, ex) =>
      t +
      ex.sets.reduce((st, s) => {
        const r = Number(s.reps);
        const w = Number(s.weight);
        return st + (Number.isFinite(r) && Number.isFinite(w) ? r * w : 0);
      }, 0),
    0,
  );

  async function submit(e) {
    e.preventDefault();
    setError('');

    const payload = {
      type,
      date,
      startTime: hasTime ? time : null,
      durationMin: duration === '' ? null : Number(duration),
      feeling,
    };

    if (type === 'musculation') {
      payload.exercises = exercises.map((ex) => ({
        name: ex.name.trim(),
        sets: ex.sets.map((s) => ({
          reps: Number(s.reps),
          weight: Number(s.weight || 0),
        })),
      }));
    } else if (type === 'cardio') {
      payload.zone = zone;
      payload.description = description.trim() || null;
    } else if (type === 'autre') {
      payload.title = title.trim();
      payload.description = description.trim() || null;
    }

    setSaving(true);
    try {
      await onSave(payload, event?.id);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  // --- Étape 1 : choix du type (création) ---
  if (!type) {
    return (
      <div className="modal-overlay" onMouseDown={onClose}>
        <div
          className="modal modal--pick"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <h2 className="modal__title">Nouvelle séance</h2>

          <div
            className="segmented pick-toggle"
            role="radiogroup"
            aria-label="Mode de création"
          >
            <button
              role="radio"
              aria-checked={pickMode === 'template'}
              className={`segmented__btn${pickMode === 'template' ? ' is-active' : ''}`}
              onClick={() => setPickMode('template')}
            >
              Depuis un template
            </button>
            <button
              role="radio"
              aria-checked={pickMode === 'scratch'}
              className={`segmented__btn${pickMode === 'scratch' ? ' is-active' : ''}`}
              onClick={() => setPickMode('scratch')}
            >
              Partir de zéro
            </button>
          </div>

          {pickMode === 'scratch' ? (
            <div className="type-tiles">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="type-tile"
                  style={{ '--c': TYPE_META[t].color }}
                  onClick={() => setType(t)}
                >
                  <span className="type-tile__icon">{TYPE_META[t].icon}</span>
                  <span className="type-tile__label">{TYPE_META[t].label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="tpl-pick">
              <input
                className="field__input tpl-pick__search"
                placeholder="🔎 Rechercher un template…"
                value={tplSearch}
                onChange={(e) => setTplSearch(e.target.value)}
                autoFocus
              />
              <div className="tpl-pick__list">
                {tplLoading ? (
                  <p className="muted tpl-pick__empty">Chargement…</p>
                ) : templates.length === 0 ? (
                  <div className="tpl-pick__empty-state">
                    <span className="tpl-pick__empty-icon">📋</span>
                    <p className="muted">
                      {tplSearch
                        ? 'Aucun template ne correspond.'
                        : 'Aucun template enregistré pour le moment.'}
                    </p>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setPickMode('scratch')}
                    >
                      Créer une séance vierge
                    </button>
                  </div>
                ) : (
                  templates.map((tpl) => {
                    const meta = TYPE_META[tpl.type];
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        className="tpl-pick__item"
                        style={{ '--c': meta.color }}
                        onClick={() => applyTemplate(tpl)}
                      >
                        <span className="tpl-pick__icon">{meta.icon}</span>
                        <span className="tpl-pick__body">
                          <span className="tpl-pick__name">{tpl.name}</span>
                          {tpl.tags.length > 0 && (
                            <span className="tpl-pick__tags">
                              {tpl.tags.map((tag) => (
                                <span key={tag} className="tpl-pick__tag">
                                  {tag}
                                </span>
                              ))}
                            </span>
                          )}
                        </span>
                        <span className="tpl-pick__go" aria-hidden="true">
                          ›
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div className="modal__actions">
            <div className="modal__actions-right">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={onClose}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const meta = TYPE_META[type];

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal modal--lg" onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="modal__title">
          <span style={{ marginRight: 8 }}>{meta.icon}</span>
          {isEdit
            ? `Modifier — ${meta.label}`
            : `Nouvelle séance — ${meta.label}`}
        </h2>

        <form onSubmit={submit}>
          {/* --- Socle commun --- */}
          <div className="form-row">
            <label className="field">
              <span className="field__label">Date</span>
              <input
                type="date"
                className="field__input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">Durée (min)</span>
              <input
                type="number"
                min="0"
                className="field__input"
                value={duration}
                placeholder="ex : 60"
                onChange={(e) => setDuration(e.target.value)}
              />
            </label>
          </div>

          <div className="form-row">
            <div className="field">
              <span className="field__label">Horaire</span>
              <div className="time-toggle">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={hasTime}
                    onChange={(e) => setHasTime(e.target.checked)}
                  />
                  <span>Préciser un horaire</span>
                </label>
                {hasTime ? (
                  <input
                    type="time"
                    className="field__input field__input--time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                ) : (
                  <span className="muted">Évènement « journée »</span>
                )}
              </div>
            </div>
            <div className="field">
              <span className="field__label">Ressenti</span>
              <div className="feeling">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    type="button"
                    key={n}
                    className={`feeling__dot${feeling >= n ? ' is-on' : ''}`}
                    onClick={() => setFeeling(feeling === n ? null : n)}
                    aria-label={`Ressenti ${n}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* --- Champs spécifiques --- */}
          {type === 'musculation' && (
            <div className="field">
              <span className="field__label">Exercices</span>
              {exercises.map((ex, ei) => (
                <div key={ei} className="exo-card">
                  <div className="exo-card__head">
                    <ExerciseCombobox
                      value={ex.name}
                      onChange={(name) => updateExercise(ei, { name })}
                    />
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => removeExercise(ei)}
                      aria-label="Supprimer l'exercice"
                    >
                      🗑
                    </button>
                  </div>
                  <div className="set-list">
                    <div className="set-row set-row--head">
                      <span>Série</span>
                      <span>Reps</span>
                      <span>Charge (kg)</span>
                      <span />
                    </div>
                    {ex.sets.map((s, si) => (
                      <div key={si} className="set-row">
                        <span className="set-row__n">{si + 1}</span>
                        <input
                          type="number"
                          min="1"
                          className="field__input field__input--xs"
                          value={s.reps}
                          onChange={(e) =>
                            updateSet(ei, si, { reps: e.target.value })
                          }
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          className="field__input field__input--xs"
                          value={s.weight}
                          onChange={(e) =>
                            updateSet(ei, si, { weight: e.target.value })
                          }
                        />
                        <button
                          type="button"
                          className="set-row__del"
                          onClick={() => removeSet(ei, si)}
                          disabled={ex.sets.length <= 1}
                          aria-label="Supprimer la série"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => addSet(ei)}
                    >
                      + série
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={addExercise}
              >
                + exercice
              </button>
              <p className="tonnage-live">
                Tonnage :{' '}
                <strong>{liveTonnage.toLocaleString('fr-FR')} kg</strong>
              </p>
            </div>
          )}

          {type === 'cardio' && (
            <>
              <div className="field">
                <span className="field__label">
                  Zone de fréquence cardiaque
                </span>
                <div className="zone-picker">
                  {CARDIO_ZONES.map((z) => (
                    <button
                      type="button"
                      key={z.id}
                      className={`zone-btn${zone === z.id ? ' is-active' : ''}`}
                      onClick={() => setZone(zone === z.id ? null : z.id)}
                      title={`${z.pct} · ${z.label}`}
                    >
                      <span className="zone-btn__id">{z.id}</span>
                      <span className="zone-btn__pct">{z.pct}</span>
                      <span className="zone-btn__lbl">{z.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <label className="field">
                <span className="field__label">Description</span>
                <textarea
                  className="field__input field__textarea"
                  rows="3"
                  value={description}
                  placeholder="Parcours, sensations…"
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
            </>
          )}

          {type === 'autre' && (
            <>
              <label className="field">
                <span className="field__label">Titre</span>
                <input
                  className="field__input"
                  maxLength={60}
                  value={title}
                  placeholder="ex : Séance d'étirements"
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field__label">Description</span>
                <textarea
                  className="field__input field__textarea"
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
            </>
          )}

          {error && <p className="modal__error">{error}</p>}

          <div className="modal__actions">
            {isEdit && (
              <div className="modal__actions-left">
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={() => onDelete(event)}
                >
                  Supprimer
                </button>
              </div>
            )}
            <div className="modal__actions-right">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={onClose}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={saving}
              >
                {saving ? '…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
