import { useEffect, useMemo, useState } from 'react';
import Combobox from '../Combobox';

// "1,5" / "30" → nombre > 0, ou null.
function parseNum(str) {
  const cleaned = String(str).replace(/\s/g, '').replace(',', '.').trim();
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}
const fmt = (n) =>
  n == null ? '' : n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

/**
 * Création / édition d'une entrée du journal : une recette (× portions) ou un
 * aliment (× quantité g/ml), à une heure optionnelle. Aperçu des macros en
 * direct ; le backend fige le snapshot réel à l'enregistrement.
 */
export default function MealLogEntryModal({
  entry,
  date,
  recipes,
  foods,
  onSave,
  onDelete,
  onClose,
}) {
  const isEdit = Boolean(entry?.id);
  const [kind, setKind] = useState(entry?.kind ?? 'recipe');
  const [recipeId, setRecipeId] = useState(entry?.recipeId ?? '');
  const [foodId, setFoodId] = useState(entry?.foodId ?? '');
  const [servings, setServings] = useState(
    entry?.servings != null ? String(entry.servings).replace('.', ',') : '1',
  );
  const [quantity, setQuantity] = useState(
    entry?.quantity != null ? String(entry.quantity).replace('.', ',') : '100',
  );
  const [time, setTime] = useState(entry?.time ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Aperçu des macros (mêmes formules que le backend).
  const preview = useMemo(() => {
    if (kind === 'recipe') {
      const r = recipes.find((x) => x.id === recipeId);
      const n = parseNum(servings) ?? 1;
      if (!r?.nutrition) return null;
      const per = r.nutrition.perServing ?? r.nutrition;
      return {
        carbs: per.carbs * n,
        protein: per.protein * n,
        fat: per.fat * n,
        kcal: per.kcal * n,
      };
    }
    const f = foods.find((x) => x.id === foodId);
    const q = parseNum(quantity) ?? 100;
    if (!f) return null;
    const factor = q / 100;
    return {
      carbs: f.carbs * factor,
      protein: f.protein * factor,
      fat: f.fat * factor,
      kcal: f.kcal * factor,
    };
  }, [kind, recipeId, foodId, servings, quantity, recipes, foods]);

  async function submit(e) {
    e.preventDefault();
    if (kind === 'recipe' && !recipeId) {
      setError('Choisis une recette.');
      return;
    }
    if (kind === 'food' && !foodId) {
      setError('Choisis un aliment.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      date,
      time: time || null,
      kind,
      recipeId: kind === 'recipe' ? recipeId : null,
      servings: kind === 'recipe' ? parseNum(servings) : null,
      foodId: kind === 'food' ? foodId : null,
      quantity: kind === 'food' ? parseNum(quantity) : null,
    };
    try {
      await onSave(payload);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="modal__title">
          {isEdit ? "Modifier l'entrée" : 'Ajouter au journal'}
        </h2>

        <form onSubmit={submit}>
          <div className="alfield">
            <span className="alfield__label">Type</span>
            <div className="mlseg">
              <button
                type="button"
                className={`mlseg__btn${kind === 'recipe' ? ' is-on' : ''}`}
                onClick={() => setKind('recipe')}
              >
                🍽️ Recette
              </button>
              <button
                type="button"
                className={`mlseg__btn${kind === 'food' ? ' is-on' : ''}`}
                onClick={() => setKind('food')}
              >
                🥑 Aliment
              </button>
            </div>
          </div>

          {kind === 'recipe' ? (
            <div className="alfield-row">
              <label className="alfield">
                <span className="alfield__label">Recette</span>
                <Combobox
                  className="alfield__input"
                  value={recipeId}
                  onChange={setRecipeId}
                  placeholder="Choisir une recette…"
                  searchable
                  options={recipes.map((r) => ({
                    value: r.id,
                    label: r.title,
                  }))}
                />
              </label>
              <label className="alfield alfield--narrow">
                <span className="alfield__label">Portions</span>
                <input
                  className="alfield__input"
                  type="text"
                  inputMode="decimal"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                />
              </label>
            </div>
          ) : (
            <div className="alfield-row">
              <label className="alfield">
                <span className="alfield__label">Aliment</span>
                <Combobox
                  className="alfield__input"
                  value={foodId}
                  onChange={setFoodId}
                  placeholder="Choisir un aliment…"
                  searchable
                  options={foods.map((f) => ({ value: f.id, label: f.name }))}
                />
              </label>
              <label className="alfield alfield--narrow">
                <span className="alfield__label">Quantité (g/ml)</span>
                <input
                  className="alfield__input"
                  type="text"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </label>
            </div>
          )}

          <label className="alfield alfield--narrow">
            <span className="alfield__label">Heure (optionnel)</span>
            <input
              className="alfield__input"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>

          {preview && (
            <p className="alfield__total">
              Aperçu : <strong>{Math.round(preview.kcal)} kcal</strong> ·{' '}
              {fmt(preview.carbs)} g gluc. · {fmt(preview.protein)} g prot. ·{' '}
              {fmt(preview.fat)} g lip.
            </p>
          )}

          {error && <p className="modal__error">{error}</p>}

          <div className="modal__actions">
            {isEdit && onDelete && (
              <div className="modal__actions-left">
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={() => onDelete(entry)}
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
