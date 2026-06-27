import { useEffect, useRef, useState } from 'react';
import { CARD_COLORS } from './constants';

let keySeq = 0;
const nextKey = () => `k${keySeq++}`;

function toComponentRows(components = []) {
  return components.map((c) => ({
    key: nextKey(),
    quantity: c.quantity != null ? String(c.quantity).replace('.', ',') : '',
    unit: c.unit ?? '',
    label: c.label ?? '',
    note: c.note ?? '',
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

/**
 * Création / édition d'un savoir-faire. Formulaire unique quelle que soit la
 * catégorie. Seul le titre est obligatoire.
 */
export default function KnowHowFormModal({
  recipe,
  categories,
  onSave,
  onArchive,
  onDelete,
  onClose,
}) {
  const isEdit = Boolean(recipe);
  const [title, setTitle] = useState(recipe?.title ?? '');
  const [goal, setGoal] = useState(recipe?.goal ?? '');
  const [categoryId, setCategoryId] = useState(recipe?.categoryId ?? '');
  const [labels, setLabels] = useState(recipe?.labels ?? []);
  const [labelDraft, setLabelDraft] = useState('');
  const [yieldText, setYieldText] = useState(recipe?.yieldText ?? '');
  const [yieldBase, setYieldBase] = useState(
    recipe?.yieldBase != null ? String(recipe.yieldBase).replace('.', ',') : '',
  );
  const [totalTimeMin, setTotalTimeMin] = useState(
    recipe?.totalTimeMin != null ? String(recipe.totalTimeMin) : '',
  );
  const [color, setColor] = useState(recipe?.color ?? '');
  const [components, setComponents] = useState(toComponentRows(recipe?.components));
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

  // --- Composants ---
  function updateComponent(key, field, value) {
    setComponents((rows) => rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }
  function addComponent() {
    setComponents((rows) => [...rows, { key: nextKey(), quantity: '', unit: '', label: '', note: '' }]);
  }
  function removeComponent(key) {
    setComponents((rows) => rows.filter((r) => r.key !== key));
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
      goal: goal.trim() || null,
      categoryId: categoryId || null,
      labels,
      components: components
        .filter((r) => r.label.trim())
        .map((r) => ({
          quantity: parseQty(r.quantity),
          unit: r.unit.trim() || null,
          label: r.label.trim(),
          note: r.note.trim() || null,
        })),
      steps: steps.filter((r) => r.text.trim()).map((r) => ({ text: r.text.trim() })),
      yieldText: yieldText.trim() || null,
      yieldBase: parseQty(yieldBase),
      totalTimeMin: totalTimeMin.trim() ? Math.round(Number(totalTimeMin.replace(',', '.'))) || null : null,
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
        <h2 className="modal__title">{isEdit ? 'Modifier le savoir-faire' : 'Nouveau savoir-faire'}</h2>

        <form onSubmit={submit}>
          <label className="ffield">
            <span className="ffield__label">Titre</span>
            <input
              ref={titleRef}
              className="ffield__input"
              type="text"
              maxLength={120}
              value={title}
              placeholder="Ex : Liquide vaisselle maison, Pâte à pizza…"
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="ffield">
            <span className="ffield__label">Objectif</span>
            <input
              className="ffield__input"
              type="text"
              value={goal}
              placeholder="Le résultat visé (optionnel)"
              onChange={(e) => setGoal(e.target.value)}
            />
          </label>

          <div className="ffield-row">
            <label className="ffield">
              <span className="ffield__label">Catégorie</span>
              <select
                className="ffield__input"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Sans catégorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
              <span className="ffield__hint">
                Les catégories se gèrent dans le Référentiel.
              </span>
            </label>
          </div>

          <div className="ffield">
            <span className="ffield__label">Labels</span>
            <div className="rlabels-edit">
              {labels.map((l) => (
                <span key={l} className="rchip rchip--removable">
                  {l}
                  <button type="button" onClick={() => removeLabel(l)} aria-label={`Retirer ${l}`}>×</button>
                </span>
              ))}
              <input
                className="rlabels-edit__input"
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

          <div className="ffield-row">
            <label className="ffield">
              <span className="ffield__label">Rendement</span>
              <input
                className="ffield__input"
                type="text"
                value={yieldText}
                placeholder="Ex : 4 personnes, ~1 L"
                onChange={(e) => setYieldText(e.target.value)}
              />
            </label>
            <label className="ffield ffield--narrow">
              <span className="ffield__label">Base (×échelle)</span>
              <input
                className="ffield__input"
                type="text"
                inputMode="decimal"
                value={yieldBase}
                placeholder="Ex : 4"
                onChange={(e) => setYieldBase(e.target.value)}
              />
            </label>
            <label className="ffield ffield--narrow">
              <span className="ffield__label">Temps (min)</span>
              <input
                className="ffield__input"
                type="text"
                inputMode="numeric"
                value={totalTimeMin}
                placeholder="Ex : 30"
                onChange={(e) => setTotalTimeMin(e.target.value)}
              />
            </label>
          </div>

          {/* Composants */}
          <div className="ffield">
            <span className="ffield__label">Composants</span>
            <div className="reditlist">
              {components.map((r) => (
                <div
                  key={r.key}
                  className="reditrow"
                  draggable
                  onDragStart={() => (dragRef.current = r.key)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => reorder(components, setComponents, dragRef.current, r.key)}
                >
                  <span className="reditrow__grip" title="Glisser pour réordonner">⠿</span>
                  <input
                    className="ffield__input reditrow__qty"
                    type="text"
                    inputMode="decimal"
                    value={r.quantity}
                    placeholder="Qté"
                    onChange={(e) => updateComponent(r.key, 'quantity', e.target.value)}
                  />
                  <input
                    className="ffield__input reditrow__unit"
                    type="text"
                    value={r.unit}
                    placeholder="Unité"
                    onChange={(e) => updateComponent(r.key, 'unit', e.target.value)}
                  />
                  <input
                    className="ffield__input reditrow__label"
                    type="text"
                    value={r.label}
                    placeholder="Intitulé (ex : farine)"
                    onChange={(e) => updateComponent(r.key, 'label', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addComponent();
                      }
                    }}
                  />
                  <button type="button" className="reditrow__del" onClick={() => removeComponent(r.key)} aria-label="Supprimer la ligne">×</button>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn--ghost btn--sm" onClick={addComponent}>
              + Composant
            </button>
            <span className="ffield__hint">
              Astuce : une ligne « — Pour la pâte — » (sans quantité) sert de titre de section.
            </span>
          </div>

          {/* Étapes */}
          <div className="ffield">
            <span className="ffield__label">Étapes</span>
            <div className="reditlist">
              {steps.map((r, i) => (
                <div
                  key={r.key}
                  className="reditrow reditrow--step"
                  draggable
                  onDragStart={() => (dragRef.current = r.key)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => reorder(steps, setSteps, dragRef.current, r.key)}
                >
                  <span className="reditrow__num">{i + 1}</span>
                  <textarea
                    className="ffield__input reditrow__steptext"
                    rows={2}
                    value={r.text}
                    placeholder="Décris l'étape…"
                    onChange={(e) => updateStep(r.key, e.target.value)}
                  />
                  <button type="button" className="reditrow__del" onClick={() => removeStep(r.key)} aria-label="Supprimer l'étape">×</button>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn--ghost btn--sm" onClick={addStep}>
              + Étape
            </button>
          </div>

          {/* Couleur */}
          <div className="ffield">
            <span className="ffield__label">Couleur</span>
            <div className="rcard__swatches rcard__swatches--inline">
              {CARD_COLORS.map((c) => (
                <button
                  type="button"
                  key={c || 'none'}
                  className={`rswatch${color === c ? ' rswatch--on' : ''}${c ? '' : ' rswatch--none'}`}
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
