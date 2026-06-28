import { useEffect, useState } from 'react';
import { alimentationApi } from '../../api/alimentation';
import { courseApi } from '../../api/course';
import { formatMeasure } from './constants';
import Combobox from '../Combobox';

/**
 * Import d'une recette du module Alimentation vers une liste de courses.
 * - `listId` fourni → enrichit la liste existante.
 * - `listId` absent → crée une nouvelle liste depuis la recette.
 * Choix des portions → mise à l'échelle (aperçu calculé côté backend, RG-12).
 */
export default function ImportRecipeModal({ listId, onClose, onDone }) {
  const [recipes, setRecipes] = useState([]);
  const [recipeId, setRecipeId] = useState('');
  const [servings, setServings] = useState('');
  const [preview, setPreview] = useState(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    alimentationApi
      .list()
      .then(setRecipes)
      .catch((e) => setError(e.message));
  }, []);

  // (Re)calcule l'aperçu à la sélection d'une recette ou au changement de portions.
  useEffect(() => {
    if (!recipeId) {
      setPreview(null);
      return;
    }
    const s = servings === '' ? null : Number(servings);
    courseApi
      .previewRecipe(recipeId, s)
      .then((p) => {
        setPreview(p);
        if (servings === '' && p.servings != null)
          setServings(String(p.servings));
        setTitle((t) => t || p.recipe.title);
      })
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId, servings]);

  async function confirm() {
    if (!recipeId) return;
    setBusy(true);
    setError('');
    try {
      const s = servings === '' ? null : Number(servings);
      const result = listId
        ? await courseApi.importRecipe(listId, { recipeId, servings: s })
        : await courseApi.createListFromRecipe({
            recipeId,
            servings: s,
            title: title.trim(),
          });
      onDone(result);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Importer une recette</h2>

        <label className="cfield">
          <span className="cfield__label">Recette</span>
          <Combobox
            className="field__input"
            value={recipeId}
            onChange={(v) => {
              setRecipeId(v);
              setError('');
            }}
            placeholder="— Choisir une recette —"
            options={recipes.map((r) => ({ value: r.id, label: r.title }))}
          />
        </label>

        {preview && (
          <>
            <div className="cfield-row">
              <label className="cfield">
                <span className="cfield__label">
                  Portions cible
                  {preview.recipe.servings != null
                    ? ` (réf. ${preview.recipe.servings})`
                    : ''}
                </span>
                <input
                  className="field__input"
                  type="number"
                  min="0"
                  step="0.5"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                />
              </label>
              {!listId && (
                <label className="cfield cfield--grow">
                  <span className="cfield__label">
                    Titre de la nouvelle liste
                  </span>
                  <input
                    className="field__input"
                    value={title}
                    maxLength={120}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
              )}
            </div>

            <p className="course-import__lead">
              {preview.items.length} ingrédient
              {preview.items.length > 1 ? 's' : ''} (mis à l'échelle)
            </p>
            <ul className="course-import__list">
              {preview.items.map((it, i) => (
                <li key={i} className="course-import__row">
                  <span className="course-import__qty">
                    {formatMeasure(it.quantity, it.unit)}
                  </span>
                  <span className="course-import__label">{it.label}</span>
                  <span
                    className={`course-import__tag${it.articleExists ? '' : ' is-new'}`}
                  >
                    {it.articleExists ? 'existant' : '✚ nouvel article'}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {error && <p className="modal__error">{error}</p>}

        <div className="modal__actions">
          <button className="btn btn--ghost" onClick={onClose}>
            Annuler
          </button>
          <button
            className="btn btn--primary"
            onClick={confirm}
            disabled={!recipeId || busy}
          >
            {listId ? 'Ajouter à la liste' : 'Créer la liste'}
          </button>
        </div>
      </div>
    </div>
  );
}
