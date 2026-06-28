import { useEffect, useMemo, useState } from 'react';
import {
  formatDuration,
  formatQuantity,
  isSection,
  scaleQuantity,
} from './constants';

/**
 * Détail d'un savoir-faire en panneau off-canvas : objectif, composants (avec mise
 * à l'échelle), étapes. Bouton « Réaliser » → Mode Réalisation.
 */
export default function KnowHowDrawer({
  recipe,
  category,
  onRealize,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onClose,
}) {
  // Mise à l'échelle (RG-09/10/11). `portions` si rendement chiffré, sinon multiplicateur.
  const hasQuantified = recipe.components.some(
    (c) => c.quantity != null && !isSection(c),
  );
  const hasBase = recipe.yieldBase != null && recipe.yieldBase > 0;
  const [portions, setPortions] = useState(hasBase ? recipe.yieldBase : 1);
  const [factor, setFactor] = useState(1);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const scale = hasBase ? portions / recipe.yieldBase : factor;

  function stepPortions(delta) {
    setPortions((p) => Math.max(1, Math.round((p + delta) * 100) / 100));
  }
  function stepFactor(delta) {
    setFactor((f) => Math.max(0.5, Math.round((f + delta) * 2) / 2));
  }

  const scaledComponents = useMemo(
    () =>
      recipe.components.map((c) => ({
        ...c,
        scaledQty: scaleQuantity(c.quantity, scale),
      })),
    [recipe.components, scale],
  );

  return (
    <div className="rdrawer-overlay" onMouseDown={onClose}>
      <aside className="rdrawer" onMouseDown={(e) => e.stopPropagation()}>
        <header className="rdrawer__head">
          <button
            className="rdrawer__close"
            onClick={onClose}
            aria-label="Fermer"
          >
            ←
          </button>
          <div className="rdrawer__heading">
            <h2 className="rdrawer__title">
              <span style={{ marginRight: 6 }}>{category.icon}</span>
              {recipe.title}
            </h2>
            <div className="rdrawer__sub">
              <span className="rdrawer__cat" style={{ '--c': category.color }}>
                {category.name}
              </span>
              {recipe.labels.map((l) => (
                <span key={l} className="rchip">
                  {l}
                </span>
              ))}
            </div>
            {(recipe.yieldText || recipe.totalTimeMin != null) && (
              <p className="rdrawer__meta">
                {[
                  recipe.yieldText,
                  recipe.totalTimeMin != null
                    ? formatDuration(recipe.totalTimeMin)
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </div>
        </header>

        <div className="rdrawer__actions">
          <button
            className="btn btn--primary"
            onClick={() => onRealize(recipe, scale)}
          >
            ▶ Réaliser
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

        {recipe.goal && (
          <p className="rdrawer__goal">
            <strong>Objectif : </strong>
            {recipe.goal}
          </p>
        )}

        {recipe.components.length > 0 && (
          <section className="rdrawer__section">
            <div className="rdrawer__sectionhead">
              <h3>Composants</h3>
              {hasQuantified && (
                <div className="rscale">
                  <span className="rscale__label">
                    {hasBase ? 'Portions' : 'Quantité'}
                  </span>
                  <button
                    className="rscale__btn"
                    onClick={() =>
                      hasBase ? stepPortions(-1) : stepFactor(-0.5)
                    }
                    aria-label="Diminuer"
                  >
                    −
                  </button>
                  <span className="rscale__value">
                    {hasBase
                      ? formatQuantity(portions)
                      : `×${formatQuantity(factor)}`}
                  </span>
                  <button
                    className="rscale__btn"
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
            <ul className="rdrawer__components">
              {scaledComponents.map((c) =>
                isSection(c) ? (
                  <li key={c.id} className="rdrawer__compsection">
                    {c.label.replace(/^[—-]\s*|\s*[—-]$/g, '')}
                  </li>
                ) : (
                  <li key={c.id} className="rdrawer__comp">
                    {c.scaledQty != null && (
                      <span className="rdrawer__compqty">
                        {formatQuantity(c.scaledQty)}
                        {c.unit ? ` ${c.unit}` : ''}
                      </span>
                    )}
                    <span className="rdrawer__complabel">
                      {c.label}
                      {c.note && (
                        <span className="rdrawer__compnote"> — {c.note}</span>
                      )}
                    </span>
                  </li>
                ),
              )}
            </ul>
          </section>
        )}

        {recipe.steps.length > 0 && (
          <section className="rdrawer__section">
            <h3>Étapes</h3>
            <ol className="rdrawer__steps">
              {recipe.steps.map((s) => (
                <li key={s.id}>{s.text}</li>
              ))}
            </ol>
          </section>
        )}

        {recipe.components.length === 0 &&
          recipe.steps.length === 0 &&
          !recipe.goal && (
            <p className="rdrawer__empty">
              Ce savoir-faire n'a pas encore de contenu. Clique sur « Éditer »
              pour l'enrichir.
            </p>
          )}
      </aside>
    </div>
  );
}
