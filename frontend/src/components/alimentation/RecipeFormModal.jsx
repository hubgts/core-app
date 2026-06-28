import { useEffect, useRef, useState } from 'react';
import { CARD_COLORS, DIFFICULTIES, formatDuration } from './constants';
import Combobox from '../Combobox';

let keySeq = 0;
const nextKey = () => `k${keySeq++}`;

function toIngredientRows(ingredients = []) {
  return ingredients.map((i) => ({
    key: nextKey(),
    quantity: i.quantity != null ? String(i.quantity).replace('.', ',') : '',
    unit: i.unit ?? '',
    label: i.label ?? '',
    note: i.note ?? '',
  }));
}
function toStepRows(steps = []) {
  return steps.map((s) => ({ key: nextKey(), text: s.text ?? '' }));
}

// "1,5" / "30" → nombre, ou null si vide/invalide.
function parseQty(str) {
  const cleaned = String(str).replace(/\s/g, '').replace(',', '.').trim();
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
// "30" → entier de minutes, ou null.
function parseInt0(str) {
  const n = parseQty(str);
  return n == null ? null : Math.round(n);
}

/**
 * Création / édition d'une recette. Seul le titre est obligatoire. Le temps
 * total s'affiche, calculé à partir des temps de préparation / cuisson / repos.
 */
export default function RecipeFormModal({
  recipe,
  mealTypes,
  onSave,
  onArchive,
  onDelete,
  onClose,
}) {
  const isEdit = Boolean(recipe);
  const [title, setTitle] = useState(recipe?.title ?? '');
  const [description, setDescription] = useState(recipe?.description ?? '');
  const [mealTypeId, setMealTypeId] = useState(recipe?.mealTypeId ?? '');
  const [labels, setLabels] = useState(recipe?.labels ?? []);
  const [labelDraft, setLabelDraft] = useState('');
  const [servings, setServings] = useState(
    recipe?.servings != null ? String(recipe.servings) : '',
  );
  const [prepTime, setPrepTime] = useState(
    recipe?.prepTimeMin != null ? String(recipe.prepTimeMin) : '',
  );
  const [cookTime, setCookTime] = useState(
    recipe?.cookTimeMin != null ? String(recipe.cookTimeMin) : '',
  );
  const [restTime, setRestTime] = useState(
    recipe?.restTimeMin != null ? String(recipe.restTimeMin) : '',
  );
  const [difficulty, setDifficulty] = useState(recipe?.difficulty ?? '');
  const [color, setColor] = useState(recipe?.color ?? '');
  const [ingredients, setIngredients] = useState(toIngredientRows(recipe?.ingredients));
  const [steps, setSteps] = useState(toStepRows(recipe?.steps));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const dragRef = useRef(null);
  const titleRef = useRef(null);

  useEffect(() => titleRef.current?.focus(), []);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Temps total = somme des temps renseignés (aperçu ; le backend recalcule).
  const totalParts = [prepTime, cookTime, restTime].map(parseInt0).filter((v) => v != null);
  const totalPreview = totalParts.length ? totalParts.reduce((a, b) => a + b, 0) : null;

  // --- Labels ---
  function addLabel() {
    const v = labelDraft.trim();
    if (!v) return;
    if (!labels.some((l) => l.toLowerCase() === v.toLowerCase())) {
      setLabels([...labels, v]);
    }
    setLabelDraft('');
  }
  function removeLabel(l) {
    setLabels(labels.filter((x) => x !== l));
  }

  // --- Ingrédients ---
  function updateIngredient(key, field, value) {
    setIngredients((rows) => rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }
  function addIngredient() {
    setIngredients((rows) => [...rows, { key: nextKey(), quantity: '', unit: '', label: '', note: '' }]);
  }
  function removeIngredient(key) {
    setIngredients((rows) => rows.filter((r) => r.key !== key));
  }

  // --- Étapes ---
  function updateStep(key, value) {
    setSteps((rows) => rows.map((r) => (r.key === key ? { ...r, text: value } : r)));
  }
  function addStep() {
    setSteps((rows) => [...rows, { key: nextKey(), text: '' }]);
  }
  function removeStep(key) {
    setSteps((rows) => rows.filter((r) => r.key !== key));
  }

  // --- Réordonnancement (drag natif) ---
  function reorder(list, setList, fromKey, toKey) {
    if (fromKey === toKey) return;
    const arr = [...list];
    const from = arr.findIndex((r) => r.key === fromKey);
    const to = arr.findIndex((r) => r.key === toKey);
    if (from < 0 || to < 0) return;
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    setList(arr);
  }

  async function submit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Le titre est obligatoire.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      mealTypeId: mealTypeId || null,
      labels,
      ingredients: ingredients
        .filter((r) => r.label.trim())
        .map((r) => ({
          quantity: parseQty(r.quantity),
          unit: r.unit.trim() || null,
          label: r.label.trim(),
          note: r.note.trim() || null,
        })),
      steps: steps.filter((r) => r.text.trim()).map((r) => ({ text: r.text.trim() })),
      servings: parseInt0(servings),
      prepTimeMin: parseInt0(prepTime),
      cookTimeMin: parseInt0(cookTime),
      restTimeMin: parseInt0(restTime),
      difficulty: difficulty || null,
      color,
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
      <div className="modal modal--lg" onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="modal__title">{isEdit ? 'Modifier la recette' : 'Nouvelle recette'}</h2>

        <form onSubmit={submit}>
          <label className="alfield">
            <span className="alfield__label">Titre</span>
            <input
              ref={titleRef}
              className="alfield__input"
              type="text"
              maxLength={120}
              value={title}
              placeholder="Ex : Gâteau au yaourt, Curry de pois chiches…"
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="alfield">
            <span className="alfield__label">Description</span>
            <input
              className="alfield__input"
              type="text"
              value={description}
              placeholder="Présentation courte (optionnel)"
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <div className="alfield-row">
            <label className="alfield">
              <span className="alfield__label">Type de repas</span>
              <Combobox
                className="alfield__input"
                value={mealTypeId}
                onChange={setMealTypeId}
                placeholder="Sans type"
                options={[
                  { value: '', label: 'Sans type' },
                  ...mealTypes.map((t) => ({
                    value: t.id,
                    label: `${t.icon} ${t.name}`,
                  })),
                ]}
              />
              <span className="alfield__hint">
                Les types de repas se gèrent dans le Référentiel.
              </span>
            </label>
            <label className="alfield alfield--narrow">
              <span className="alfield__label">Difficulté</span>
              <Combobox
                className="alfield__input"
                value={difficulty}
                onChange={setDifficulty}
                placeholder="—"
                options={[
                  { value: '', label: '—' },
                  ...DIFFICULTIES.map((d) => ({ value: d.value, label: d.label })),
                ]}
              />
            </label>
          </div>

          <div className="alfield">
            <span className="alfield__label">Labels</span>
            <div className="allabels-edit">
              {labels.map((l) => (
                <span key={l} className="alchip alchip--removable">
                  {l}
                  <button type="button" onClick={() => removeLabel(l)} aria-label={`Retirer ${l}`}>×</button>
                </span>
              ))}
              <input
                className="allabels-edit__input"
                type="text"
                value={labelDraft}
                placeholder="Ajouter un label + Entrée"
                onChange={(e) => setLabelDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addLabel();
                  }
                }}
                onBlur={addLabel}
              />
            </div>
          </div>

          <div className="alfield-row">
            <label className="alfield alfield--narrow">
              <span className="alfield__label">Portions</span>
              <input
                className="alfield__input"
                type="text"
                inputMode="numeric"
                value={servings}
                placeholder="Ex : 4"
                onChange={(e) => setServings(e.target.value)}
              />
            </label>
            <label className="alfield alfield--narrow">
              <span className="alfield__label">Prép. (min)</span>
              <input
                className="alfield__input"
                type="text"
                inputMode="numeric"
                value={prepTime}
                placeholder="Ex : 15"
                onChange={(e) => setPrepTime(e.target.value)}
              />
            </label>
            <label className="alfield alfield--narrow">
              <span className="alfield__label">Cuisson (min)</span>
              <input
                className="alfield__input"
                type="text"
                inputMode="numeric"
                value={cookTime}
                placeholder="Ex : 35"
                onChange={(e) => setCookTime(e.target.value)}
              />
            </label>
            <label className="alfield alfield--narrow">
              <span className="alfield__label">Repos (min)</span>
              <input
                className="alfield__input"
                type="text"
                inputMode="numeric"
                value={restTime}
                placeholder="Ex : 0"
                onChange={(e) => setRestTime(e.target.value)}
              />
            </label>
          </div>
          {totalPreview != null && (
            <p className="alfield__total">Temps total : {formatDuration(totalPreview)}</p>
          )}

          {/* Ingrédients */}
          <div className="alfield">
            <span className="alfield__label">Ingrédients</span>
            <div className="aleditlist">
              {ingredients.map((r) => (
                <div
                  key={r.key}
                  className="aleditrow"
                  draggable
                  onDragStart={() => (dragRef.current = r.key)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => reorder(ingredients, setIngredients, dragRef.current, r.key)}
                >
                  <span className="aleditrow__grip" title="Glisser pour réordonner">⠿</span>
                  <input
                    className="alfield__input aleditrow__qty"
                    type="text"
                    inputMode="decimal"
                    value={r.quantity}
                    placeholder="Qté"
                    onChange={(e) => updateIngredient(r.key, 'quantity', e.target.value)}
                  />
                  <input
                    className="alfield__input aleditrow__unit"
                    type="text"
                    value={r.unit}
                    placeholder="Unité"
                    onChange={(e) => updateIngredient(r.key, 'unit', e.target.value)}
                  />
                  <input
                    className="alfield__input aleditrow__label"
                    type="text"
                    value={r.label}
                    placeholder="Ingrédient (ex : farine)"
                    onChange={(e) => updateIngredient(r.key, 'label', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addIngredient();
                      }
                    }}
                  />
                  <button type="button" className="aleditrow__del" onClick={() => removeIngredient(r.key)} aria-label="Supprimer la ligne">×</button>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn--ghost btn--sm" onClick={addIngredient}>
              + Ingrédient
            </button>
            <span className="alfield__hint">
              Astuce : une ligne « — Pour la garniture — » (sans quantité) sert de titre de section.
            </span>
          </div>

          {/* Étapes */}
          <div className="alfield">
            <span className="alfield__label">Étapes</span>
            <div className="aleditlist">
              {steps.map((r, i) => (
                <div
                  key={r.key}
                  className="aleditrow aleditrow--step"
                  draggable
                  onDragStart={() => (dragRef.current = r.key)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => reorder(steps, setSteps, dragRef.current, r.key)}
                >
                  <span className="aleditrow__num">{i + 1}</span>
                  <textarea
                    className="alfield__input aleditrow__steptext"
                    rows={2}
                    value={r.text}
                    placeholder="Décris l'étape…"
                    onChange={(e) => updateStep(r.key, e.target.value)}
                  />
                  <button type="button" className="aleditrow__del" onClick={() => removeStep(r.key)} aria-label="Supprimer l'étape">×</button>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn--ghost btn--sm" onClick={addStep}>
              + Étape
            </button>
          </div>

          {/* Couleur */}
          <div className="alfield">
            <span className="alfield__label">Couleur</span>
            <div className="alcard__swatches alcard__swatches--inline">
              {CARD_COLORS.map((c) => (
                <button
                  type="button"
                  key={c || 'none'}
                  className={`alswatch${color === c ? ' alswatch--on' : ''}${c ? '' : ' alswatch--none'}`}
                  style={c ? { background: c } : undefined}
                  title={c ? 'Couleur' : 'Sans couleur'}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          {error && <p className="modal__error">{error}</p>}

          <div className="modal__actions">
            {isEdit && (
              <div className="modal__actions-left">
                <button type="button" className="btn btn--ghost" onClick={() => onArchive(recipe)}>
                  Archiver
                </button>
                <button type="button" className="btn btn--danger" onClick={() => onDelete(recipe)}>
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
