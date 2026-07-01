import { useEffect, useRef, useState } from 'react';
import Combobox from '../Combobox';

// "12,5" / "30" → nombre ≥ 0, ou null si vide/invalide.
function parseNum(str) {
  const cleaned = String(str).replace(/\s/g, '').replace(',', '.').trim();
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const UNIT_OPTIONS = [
  { value: 'g', label: 'g (pour 100 g)' },
  { value: 'ml', label: 'ml (pour 100 ml)' },
];

/**
 * Création / édition d'un aliment : macros pour 100 g/ml. Les calories sont
 * dérivées en direct (aperçu) ; le backend recalcule la valeur de référence.
 * Réutilisé par la page Aliments et le quick-add du formulaire de recette.
 */
export default function FoodFormModal({
  food,
  defaultName = '',
  onSave,
  onDelete,
  onClose,
}) {
  const isEdit = Boolean(food?.id);
  const [name, setName] = useState(food?.name ?? defaultName);
  const [unit, setUnit] = useState(food?.unit ?? 'g');
  const [carbs, setCarbs] = useState(
    food?.carbs != null ? String(food.carbs).replace('.', ',') : '',
  );
  const [protein, setProtein] = useState(
    food?.protein != null ? String(food.protein).replace('.', ',') : '',
  );
  const [fat, setFat] = useState(
    food?.fat != null ? String(food.fat).replace('.', ',') : '',
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const nameRef = useRef(null);

  useEffect(() => nameRef.current?.focus(), []);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Aperçu des calories : 4·glucides + 4·protéines + 9·lipides.
  const c = parseNum(carbs) ?? 0;
  const p = parseNum(protein) ?? 0;
  const f = parseNum(fat) ?? 0;
  const kcalPreview = Math.round((4 * c + 4 * p + 9 * f) * 10) / 10;

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Le nom est obligatoire.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        name: name.trim(),
        unit,
        carbs: parseNum(carbs),
        protein: parseNum(protein),
        fat: parseNum(fat),
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  const per = unit === 'ml' ? '100 ml' : '100 g';

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="modal__title">
          {isEdit ? "Modifier l'aliment" : 'Nouvel aliment'}
        </h2>

        <form onSubmit={submit}>
          <label className="alfield">
            <span className="alfield__label">Nom</span>
            <input
              ref={nameRef}
              className="alfield__input"
              type="text"
              maxLength={80}
              value={name}
              placeholder="Ex : Farine de blé, Lait demi-écrémé…"
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="alfield alfield--narrow">
            <span className="alfield__label">Base</span>
            <Combobox
              className="alfield__input"
              value={unit}
              onChange={setUnit}
              options={UNIT_OPTIONS}
            />
          </label>

          <div className="alfield-row">
            <label className="alfield alfield--narrow">
              <span className="alfield__label">Glucides (g / {per})</span>
              <input
                className="alfield__input"
                type="text"
                inputMode="decimal"
                value={carbs}
                placeholder="0"
                onChange={(e) => setCarbs(e.target.value)}
              />
            </label>
            <label className="alfield alfield--narrow">
              <span className="alfield__label">Protéines (g / {per})</span>
              <input
                className="alfield__input"
                type="text"
                inputMode="decimal"
                value={protein}
                placeholder="0"
                onChange={(e) => setProtein(e.target.value)}
              />
            </label>
            <label className="alfield alfield--narrow">
              <span className="alfield__label">Lipides (g / {per})</span>
              <input
                className="alfield__input"
                type="text"
                inputMode="decimal"
                value={fat}
                placeholder="0"
                onChange={(e) => setFat(e.target.value)}
              />
            </label>
          </div>

          <p className="alfield__total">
            Calories : <strong>{kcalPreview} kcal</strong> / {per}
          </p>

          {error && <p className="modal__error">{error}</p>}

          <div className="modal__actions">
            {isEdit && onDelete && (
              <div className="modal__actions-left">
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={() => onDelete(food)}
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
