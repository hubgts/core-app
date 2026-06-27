import { useEffect, useState } from 'react';
import { CARDIO_ZONES, TYPE_META, TYPES } from './constants';
import ExerciseCombobox from './ExerciseCombobox';
import TagInput from './TagInput';

const emptySet = () => ({ reps: '', weight: '' });
const emptyExercise = () => ({ name: '', sets: [emptySet()] });

function initExercises(tpl) {
  if (tpl?.type === 'musculation' && tpl.exercises?.length) {
    return tpl.exercises.map((ex) => ({
      name: ex.name,
      sets: ex.sets.map((s) => ({ reps: String(s.reps), weight: String(s.weight) })),
    }));
  }
  return [emptyExercise()];
}

/**
 * Création / édition d'un template de séance. Même contenu qu'une séance
 * (type + champs spécifiques) mais sans date/horaire, plus un nom et des
 * étiquettes pour le retrouver dans la liste.
 */
export default function TemplateFormModal({ template, presetType, onSave, onDelete, onClose }) {
  const isEdit = Boolean(template);
  const [type, setType] = useState(template?.type ?? presetType ?? null);

  const [name, setName] = useState(template?.name ?? '');
  const [tags, setTags] = useState(template?.tags ?? []);
  const [duration, setDuration] = useState(
    template?.durationMin != null ? String(template.durationMin) : '',
  );
  const [feeling, setFeeling] = useState(template?.feeling ?? null);

  const [exercises, setExercises] = useState(() => initExercises(template));
  const [zone, setZone] = useState(template?.zone ?? null);
  const [title, setTitle] = useState(template?.title ?? '');
  const [description, setDescription] = useState(template?.description ?? '');

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // --- musculation : édition des exercices/séries ---
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

  async function submit(e) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Le nom du template est obligatoire.');
      return;
    }

    const payload = {
      type,
      name: name.trim(),
      tags,
      durationMin: duration === '' ? null : Number(duration),
      feeling,
    };

    if (type === 'musculation') {
      payload.exercises = exercises
        .filter((ex) => ex.name.trim())
        .map((ex) => ({
          name: ex.name.trim(),
          sets: ex.sets
            .filter((s) => s.reps !== '')
            .map((s) => ({ reps: Number(s.reps), weight: Number(s.weight || 0) })),
        }));
    } else if (type === 'cardio') {
      payload.zone = zone;
      payload.description = description.trim() || null;
    } else if (type === 'autre') {
      payload.title = title.trim() || null;
      payload.description = description.trim() || null;
    }

    setSaving(true);
    try {
      await onSave(payload, template?.id);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  // --- Étape 1 : choix du type (création) ---
  if (!type) {
    return (
      <div className="modal-overlay" onMouseDown={onClose}>
        <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
          <h2 className="modal__title">Nouveau template</h2>
          <p className="field__label">Quel type d'entraînement ?</p>
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
          {isEdit ? `Modifier le template — ${meta.label}` : `Nouveau template — ${meta.label}`}
        </h2>

        <form onSubmit={submit}>
          <label className="field">
            <span className="field__label">Nom du template</span>
            <input
              className="field__input"
              maxLength={80}
              value={name}
              placeholder="ex : Push lourd, Sortie longue…"
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field__label">Étiquettes</span>
            <TagInput value={tags} onChange={setTags} placeholder="ex : haut du corps, salle…" />
          </label>

          <div className="form-row">
            <label className="field">
              <span className="field__label">Durée par défaut (min)</span>
              <input
                type="number"
                min="0"
                className="field__input"
                value={duration}
                placeholder="ex : 60"
                onChange={(e) => setDuration(e.target.value)}
              />
            </label>
            <div className="field">
              <span className="field__label">Ressenti par défaut</span>
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
                      onChange={(n) => updateExercise(ei, { name: n })}
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
                  placeholder="Parcours type, consignes…"
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
            </>
          )}

          {type === 'autre' && (
            <>
              <label className="field">
                <span className="field__label">Titre de séance (par défaut)</span>
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
                <button type="button" className="btn btn--danger" onClick={() => onDelete(template)}>
                  Supprimer
                </button>
              </div>
            )}
            <div className="modal__actions-right">
              <button type="button" className="btn btn--ghost" onClick={onClose}>Annuler</button>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? '…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
