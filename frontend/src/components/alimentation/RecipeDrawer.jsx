import { useEffect, useMemo, useState } from 'react';
import {
  difficultyLabel,
  formatDuration,
  formatQuantity,
  formatServings,
  isSection,
  scaleQuantity,
} from './constants';

/**
 * Détail d'une recette en panneau off-canvas : description, ingrédients (avec
 * mise à l'échelle par portions), étapes. Bouton « Cuisiner » → Mode Cuisine.
 */
export default function RecipeDrawer({
  recipe,
  mealType,
  onCook,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onClose,
}) {
  // Mise à l'échelle (RG-09/10/11). `portions` cible si servings chiffré,
  // sinon multiplicateur libre.
  const hasQuantified = recipe.ingredients.some(
    (i) => i.quantity != null && !isSection(i),
  );
  const hasBase = recipe.servings != null && recipe.servings > 0;
  const [portions, setPortions] = useState(hasBase ? recipe.servings : 1);
  const [factor, setFactor] = useState(1);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const scale = hasBase ? portions / recipe.servings : factor;

  function stepPortions(delta) {
    setPortions((p) => Math.max(1, Math.round(p + delta)));
  }
  function stepFactor(delta) {
    setFactor((f) => Math.max(0.5, Math.round((f + delta) * 2) / 2));
  }

  const scaledIngredients = useMemo(
    () =>
      recipe.ingredients.map((i) => ({
        ...i,
        scaledQty: scaleQuantity(i.quantity, scale),
      })),
    [recipe.ingredients, scale],
  );

  const timeBits = [
    recipe.prepTimeMin != null
      ? `Prép ${formatDuration(recipe.prepTimeMin)}`
      : null,
    recipe.cookTimeMin != null
      ? `Cuisson ${formatDuration(recipe.cookTimeMin)}`
      : null,
    recipe.restTimeMin != null
      ? `Repos ${formatDuration(recipe.restTimeMin)}`
      : null,
  ].filter(Boolean);
  const metaBits = [
    recipe.servings != null ? formatServings(recipe.servings) : null,
    ...timeBits,
    recipe.totalTimeMin != null
      ? `Total ${formatDuration(recipe.totalTimeMin)}`
      : null,
    recipe.difficulty ? difficultyLabel(recipe.difficulty) : null,
  ].filter(Boolean);

  return (
    <div className="aldrawer-overlay" onMouseDown={onClose}>
      <aside className="aldrawer" onMouseDown={(e) => e.stopPropagation()}>
        <header className="aldrawer__head">
          <button
            className="aldrawer__close"
            onClick={onClose}
            aria-label="Fermer"
          >
            ←
          </button>
          <div className="aldrawer__heading">
            <h2 className="aldrawer__title">
              <span style={{ marginRight: 6 }}>{mealType.icon}</span>
              {recipe.title}
            </h2>
            <div className="aldrawer__sub">
              <span
                className="aldrawer__type"
                style={{ '--c': mealType.color }}
              >
                {mealType.name}
              </span>
              {recipe.labels.map((l) => (
                <span key={l} className="alchip">
                  {l}
                </span>
              ))}
            </div>
            {metaBits.length > 0 && (
              <p className="aldrawer__meta">{metaBits.join(' · ')}</p>
            )}
          </div>
        </header>

        <div className="aldrawer__actions">
          <button
            className="btn btn--primary"
            onClick={() => onCook(recipe, scale)}
          >
            ▶ Cuisiner
          </button>
          <button className="btn btn--ghost" onClick={() => onEdit(recipe)}>
            Éditer
          </button>
          <button
            className="btn btn--ghost"
            onClick={() => onDuplicate(recipe)}
          >
            Dupliquer
          </button>
          <button className="btn btn--ghost" onClick={() => onArchive(recipe)}>
            Archiver
          </button>
          <button className="btn btn--danger" onClick={() => onDelete(recipe)}>
            Supprimer
          </button>
        </div>

        {recipe.description && (
          <p className="aldrawer__desc">{recipe.description}</p>
        )}

        {recipe.ingredients.length > 0 && (
          <section className="aldrawer__section">
            <div className="aldrawer__sectionhead">
              <h3>Ingrédients</h3>
              {hasQuantified && (
                <div className="alscale">
                  <span className="alscale__label">
                    {hasBase ? 'Portions' : 'Quantité'}
                  </span>
                  <button
                    className="alscale__btn"
                    onClick={() =>
                      hasBase ? stepPortions(-1) : stepFactor(-0.5)
                    }
                    aria-label="Diminuer"
                  >
                    −
                  </button>
                  <span className="alscale__value">
                    {hasBase
                      ? formatQuantity(portions)
                      : `×${formatQuantity(factor)}`}
                  </span>
                  <button
                    className="alscale__btn"
                    onClick={() =>
                      hasBase ? stepPortions(1) : stepFactor(0.5)
                    }
                    aria-label="Augmenter"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
            <ul className="aldrawer__ingredients">
              {scaledIngredients.map((i) =>
                isSection(i) ? (
                  <li key={i.id} className="aldrawer__ingsection">
                    {i.label.replace(/^[—-]\s*|\s*[—-]$/g, '')}
                  </li>
                ) : (
                  <li key={i.id} className="aldrawer__ing">
                    {i.scaledQty != null && (
                      <span className="aldrawer__ingqty">
                        {formatQuantity(i.scaledQty)}
                        {i.unit ? ` ${i.unit}` : ''}
                      </span>
                    )}
                    <span className="aldrawer__inglabel">
                      {i.label}
                      {i.note && (
                        <span className="aldrawer__ingnote"> — {i.note}</span>
                      )}
                    </span>
                  </li>
                ),
              )}
            </ul>
          </section>
        )}

        {recipe.steps.length > 0 && (
          <section className="aldrawer__section">
            <h3>Étapes</h3>
            <ol className="aldrawer__steps">
              {recipe.steps.map((s) => (
                <li key={s.id}>{s.text}</li>
              ))}
            </ol>
          </section>
        )}

        {recipe.ingredients.length === 0 &&
          recipe.steps.length === 0 &&
          !recipe.description && (
            <p className="aldrawer__empty">
              Cette recette n'a pas encore de contenu. Clique sur « Éditer »
              pour l'enrichir.
            </p>
          )}
      </aside>
    </div>
  );
}
