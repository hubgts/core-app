import { useEffect, useRef, useState } from 'react';
import { todayStr } from '../../utils/date';

function parseNum(str) {
  const cleaned = String(str).replace(/\s/g, '').replace(',', '.').trim();
  if (cleaned === '') return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) throw new Error('Valeur invalide.');
  return n;
}

/** Définition / modification de l'objectif de poids (un seul actif). */
export default function GoalModal({ goal, currentWeight, today, onSave, onClear, onClose }) {
  const isEdit = Boolean(goal);
  const [target, setTarget] = useState(
    goal?.targetWeightKg != null ? String(goal.targetWeightKg).replace('.', ',') : '',
  );
  const [date, setDate] = useState(goal?.targetDate ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    let targetWeightKg;
    try {
      targetWeightKg = parseNum(target);
    } catch {
      setError('Poids cible invalide.');
      return;
    }
    if (targetWeightKg == null) {
      setError('Indiquez un poids cible.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ targetWeightKg, targetDate: date || null });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  const targetNum = parseFloat(String(target).replace(',', '.'));
  const dir =
    currentWeight != null && targetNum
      ? targetNum < currentWeight
        ? 'Perdre'
        : 'Prendre'
      : null;

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="modal__title">{isEdit ? "Modifier l'objectif" : 'Définir un objectif'}</h2>

        <form onSubmit={submit}>
          <label className="hfield">
            <span className="hfield__label">🎯 Poids cible (kg)</span>
            <input
              ref={ref}
              className="hfield__input"
              type="text"
              inputMode="decimal"
              value={target}
              placeholder="75,0"
              onChange={(e) => setTarget(e.target.value)}
            />
            {dir && currentWeight != null && (
              <span className="hfield__hint">
                {dir} {Math.abs(currentWeight - targetNum).toFixed(1)} kg
                depuis {currentWeight} kg (tendance actuelle).
              </span>
            )}
          </label>

          <label className="hfield">
            <span className="hfield__label">Échéance souhaitée (optionnel)</span>
            <input
              className="hfield__input"
              type="date"
              value={date}
              min={today ?? todayStr()}
              onChange={(e) => setDate(e.target.value)}
            />
            <span className="hfield__hint">
              Sans échéance, on estime juste la date d'atteinte au rythme réel.
            </span>
          </label>

          {error && <p className="modal__error">{error}</p>}

          <div className="modal__actions">
            {isEdit && (
              <div className="modal__actions-left">
                <button type="button" className="btn btn--ghost" onClick={onClear}>
                  Retirer l'objectif
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
