import { useEffect, useState } from 'react';
import { trainingApi } from '../../api/training';
import { CARDIO_ZONES, PROGRAM_DAYS, TYPE_META, TYPES } from './constants';
import ExerciseCombobox from './ExerciseCombobox';
import Combobox from '../Combobox';

const emptySet = () => ({ reps: '', weight: '' });
const emptyExercise = () => ({ name: '', sets: [emptySet()] });

function initExercises(session) {
  if (session?.type === 'musculation' && session.exercises?.length) {
    return session.exercises.map((ex) => ({
      name: ex.name,
      sets: ex.sets.map((s) => ({ reps: String(s.reps), weight: String(s.weight) })),
    }));
  }
  return [emptyExercise()];
}

/**
 * Édite une séance de programme (sans date : on choisit le jour J1..J7).
 * `onSave(session)` renvoie l'objet séance ; la persistance est gérée par
 * l'éditeur de programme (le programme est enregistré d'un bloc).
 */
export default function ProgramSessionModal({ session, presetDay, onSave, onDelete, onClose }) {
  const isEdit = Boolean(session);
  const [type, setType] = useState(session?.type ?? null);

  const [dayOfWeek, setDayOfWeek] = useState(session?.dayOfWeek ?? presetDay ?? 1);
  const [label, setLabel] = useState(session?.label ?? '');
  const [hasTime, setHasTime] = useState(Boolean(session?.startTime));
  const [time, setTime] = useState(session?.startTime ?? '18:00');
  const [duration, setDuration] = useState(
    session?.durationMin != null ? String(session.durationMin) : '',
  );

  const [exercises, setExercises] = useState(() => initExercises(session));
  const [zone, setZone] = useState(session?.zone ?? null);
  const [title, setTitle] = useState(session?.title ?? '');
  const [description, setDescription] = useState(session?.description ?? '');
  const [sourceTemplateId, setSourceTemplateId] = useState(session?.sourceTemplateId ?? null);
  const [error, setError] = useState('');

  const [templates, setTemplates] = useState([]);
  const [tplSearch, setTplSearch] = useState('');
  const [tplLoading, setTplLoading] = useState(true);
  const [pickMode, setPickMode] = useState('template');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (isEdit || type) return undefined;
    let alive = true;
    setTplLoading(true);
    const t = setTimeout(() => {
      trainingApi
        .templates(tplSearch)
        .then((rows) => alive && (setTemplates(rows), setTplLoading(false)))
        .catch(() => alive && (setTemplates([]), setTplLoading(false)));
    }, 150);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [isEdit, type, tplSearch]);

  function applyTemplate(tpl) {
    setType(tpl.type);
    setSourceTemplateId(tpl.id);
    setLabel(tpl.name || '');
    setDuration(tpl.durationMin != null ? String(tpl.durationMin) : '');
    if (tpl.type === 'musculation') {
      setExercises(
        tpl.exercises?.length
          ? tpl.exercises.map((ex) => ({
              name: ex.name,
              sets: ex.sets.length
                ? ex.sets.map((s) => ({ reps: String(s.reps), weight: String(s.weight) }))
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

  const updateExercise = (i, patch) =>
    setExercises((prev) => prev.map((ex, idx) => (idx === i ? { ...ex, ...patch } : ex)));
  const updateSet = (ei, si, patch) =>
    setExercises((prev) =>
      prev.map((ex, idx) =>
        idx === ei
          ? { ...ex, sets: ex.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) }
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
  const removeExercise = (ei) => setExercises((prev) => prev.filter((_, idx) => idx !== ei));

  function submit(e) {
    e.preventDefault();
    setError('');
    const next = {
      ...(session ?? {}),
      dayOfWeek: Number(dayOfWeek),
      label: label.trim() || null,
      type,
      startTime: hasTime ? time : null,
      durationMin: duration === '' ? null : Number(duration),
      feeling: null,
      zone: null,
      title: null,
      description: null,
      exercises: [],
      sourceTemplateId,
    };

    if (type === 'musculation') {
      const cleaned = exercises
        .map((ex) => ({
          name: ex.name.trim(),
          sets: ex.sets
            .filter((s) => s.reps !== '' || s.weight !== '')
            .map((s) => ({ reps: Number(s.reps || 0), weight: Number(s.weight || 0) })),
        }))
        .filter((ex) => ex.name && ex.sets.length);
      if (cleaned.length === 0) {
        setError('Ajoute au moins un exercice avec une série.');
        return;
      }
      next.exercises = cleaned;
    } else if (type === 'cardio') {
      next.zone = zone;
      next.description = description.trim() || null;
    } else if (type === 'autre') {
      next.title = title.trim() || null;
      next.description = description.trim() || null;
    }
    onSave(next);
  }

  // --- Étape 1 : choix du type / template ---
  if (!type) {
    return (
      <div className="modal-overlay" onMouseDown={onClose}>
        <div className="modal modal--pick" onMouseDown={(e) => e.stopPropagation()}>
          <h2 className="modal__title">Nouvelle séance du programme</h2>
          <div className="segmented pick-toggle" role="radiogroup" aria-label="Mode de création">
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
                      {tplSearch ? 'Aucun template ne correspond.' : 'Aucun template enregistré.'}
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
                        </span>
                        <span className="tpl-pick__go" aria-hidden="true">›</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div className="modal__actions">
            <div className="modal__actions-right">
              <button type="button" className="btn btn--ghost" onClick={onClose}>Annuler</button>
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
          {isEdit ? `Modifier — ${meta.label}` : `Séance — ${meta.label}`}
        </h2>

        <form onSubmit={submit}>
          <div className="form-row">
            <label className="field">
              <span className="field__label">Jour</span>
              <Combobox
                className="field__input"
                value={dayOfWeek}
                onChange={setDayOfWeek}
                options={PROGRAM_DAYS.map((d) => ({
                  value: d.value,
                  label: `${d.code} — ${d.label}`,
                }))}
              />
            </label>
            <label className="field">
              <span className="field__label">Nom (optionnel)</span>
              <input
                className="field__input"
                maxLength={60}
                value={label}
                placeholder="ex : Push A"
                onChange={(e) => setLabel(e.target.value)}
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
                  <span className="muted">Séance « journée »</span>
                )}
              </div>
            </div>
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

          {type === 'musculation' && (
            <div className="field">
              <span className="field__label">Exercices</span>
              {exercises.map((ex, ei) => (
                <div key={ei} className="exo-card">
                  <div className="exo-card__head">
                    <ExerciseCombobox value={ex.name} onChange={(name) => updateExercise(ei, { name })} />
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
                      <span>Série</span><span>Reps</span><span>Charge (kg)</span><span />
                    </div>
                    {ex.sets.map((s, si) => (
                      <div key={si} className="set-row">
                        <span className="set-row__n">{si + 1}</span>
                        <input
                          type="number"
                          min="1"
                          className="field__input field__input--xs"
                          value={s.reps}
                          onChange={(e) => updateSet(ei, si, { reps: e.target.value })}
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          className="field__input field__input--xs"
                          value={s.weight}
                          onChange={(e) => updateSet(ei, si, { weight: e.target.value })}
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
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => addSet(ei)}>
                      + série
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn--ghost btn--sm" onClick={addExercise}>
                + exercice
              </button>
            </div>
          )}

          {type === 'cardio' && (
            <>
              <div className="field">
                <span className="field__label">Zone de fréquence cardiaque</span>
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
                  placeholder="ex : Étirements"
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
                <button type="button" className="btn btn--danger" onClick={() => onDelete(session)}>
                  Supprimer
                </button>
              </div>
            )}
            <div className="modal__actions-right">
              <button type="button" className="btn btn--ghost" onClick={onClose}>Annuler</button>
              <button type="submit" className="btn btn--primary">Valider</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
