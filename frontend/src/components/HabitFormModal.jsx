import { useEffect, useRef, useState } from 'react';
import './HabitFormModal.css';

// Tons « 400 » : lisibles comme accents sur fond sombre.
const COLORS = [
  '#818cf8', '#38bdf8', '#34d399', '#fbbf24',
  '#f87171', '#f472b6', '#a78bfa', '#2dd4bf',
];

const ICONS = ['✅', '🧘', '📖', '💧', '🏃', '🚫', '🌙', '💪', '🥗', '🧠', '✍️', '☀️'];

export default function HabitFormModal({ habit, onSave, onArchive, onDelete, onClose }) {
  const isEdit = Boolean(habit);
  const [name, setName] = useState(habit?.name ?? '');
  const [weeklyTarget, setWeeklyTarget] = useState(habit?.weeklyTarget ?? 7);
  const [color, setColor] = useState(habit?.color ?? COLORS[0]);
  const [icon, setIcon] = useState(habit?.icon ?? ICONS[0]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Le nom est obligatoire.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ name: name.trim(), weeklyTarget, color, icon });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="modal__title">
          {isEdit ? 'Modifier l’habitude' : 'Nouvelle habitude'}
        </h2>

        <form onSubmit={submit}>
          <label className="field">
            <span className="field__label">Nom</span>
            <input
              ref={inputRef}
              className="field__input"
              type="text"
              maxLength={40}
              value={name}
              placeholder="Ex : Méditer, Lecture 10 min…"
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <div className="field">
            <span className="field__label">Objectif hebdomadaire</span>
            <div className="picker picker--target" role="radiogroup" aria-label="Fois par semaine">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  type="button"
                  key={n}
                  role="radio"
                  aria-checked={n === weeklyTarget}
                  className={`picker__target${n === weeklyTarget ? ' picker__target--active' : ''}`}
                  onClick={() => setWeeklyTarget(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <span className="field__hint">
              {weeklyTarget === 7
                ? 'Tous les jours.'
                : `${weeklyTarget} fois par semaine.`}
            </span>
          </div>

          <div className="field">
            <span className="field__label">Icône</span>
            <div className="picker">
              {ICONS.map((ic) => (
                <button
                  type="button"
                  key={ic}
                  className={`picker__emoji${ic === icon ? ' picker__emoji--active' : ''}`}
                  onClick={() => setIcon(ic)}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="field__label">Couleur</span>
            <div className="picker">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`picker__color${c === color ? ' picker__color--active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Couleur ${c}`}
                />
              ))}
            </div>
          </div>

          {error && <p className="modal__error">{error}</p>}

          <div className="modal__actions">
            {isEdit && (
              <div className="modal__actions-left">
                <button type="button" className="btn btn--ghost" onClick={() => onArchive(habit)}>
                  Archiver
                </button>
                <button type="button" className="btn btn--danger" onClick={() => onDelete(habit)}>
                  Supprimer
                </button>
              </div>
            )}
            <div className="modal__actions-right">
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                Annuler
              </button>
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
