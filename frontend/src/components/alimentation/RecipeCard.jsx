import { useState } from 'react';
import {
  CARD_COLORS,
  formatDuration,
  formatQuantity,
  formatServings,
  isSection,
} from './constants';

/**
 * Carte du board façon Google Keep : couleur de fond, type de repas, aperçu du
 * contenu, labels, épinglage et menu d'actions.
 */
export default function RecipeCard({
  recipe,
  mealType,
  onOpen,
  onTogglePin,
  onSetColor,
  onDuplicate,
  onArchive,
  onDelete,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const { ingredients = [], steps = [], labels = [] } = recipe;
  const previewIngredients = ingredients
    .filter((i) => !isSection(i))
    .slice(0, 3);

  const metaBits = [];
  if (recipe.servings != null) metaBits.push(formatServings(recipe.servings));
  if (recipe.totalTimeMin != null)
    metaBits.push(formatDuration(recipe.totalTimeMin));

  function act(fn) {
    return (e) => {
      e.stopPropagation();
      setMenuOpen(false);
      fn();
    };
  }

  return (
    <article
      className="alcard"
      style={recipe.color ? { '--card-c': recipe.color } : undefined}
      onClick={() => onOpen(recipe.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(recipe.id);
        }
      }}
      aria-label={`${recipe.title}, ${mealType.name}, ${ingredients.length} ingrédients, ${steps.length} étapes${recipe.pinned ? ', épinglé' : ''}`}
    >
      <header className="alcard__head">
        <span className="alcard__type" style={{ '--c': mealType.color }}>
          <span className="alcard__type-icon">{mealType.icon}</span>
          {mealType.name}
        </span>
        <button
          className={`alcard__pin${recipe.pinned ? ' alcard__pin--on' : ''}`}
          title={recipe.pinned ? 'Désépingler' : 'Épingler'}
          onClick={act(() => onTogglePin(recipe))}
        >
          {recipe.pinned ? '📌' : '📍'}
        </button>
      </header>

      <h3 className="alcard__title">{recipe.title}</h3>

      {metaBits.length > 0 && (
        <p className="alcard__meta">{metaBits.join(' · ')}</p>
      )}

      {previewIngredients.length > 0 ? (
        <ul className="alcard__preview">
          {previewIngredients.map((i) => (
            <li key={i.id}>
              {i.quantity != null && (
                <span className="alcard__qty">
                  {formatQuantity(i.quantity)}
                  {i.unit ? ` ${i.unit}` : ''}
                </span>
              )}{' '}
              {i.label}
            </li>
          ))}
          {ingredients.length > previewIngredients.length && (
            <li className="alcard__more">
              +{ingredients.length - previewIngredients.length} de plus…
            </li>
          )}
        </ul>
      ) : (
        <p className="alcard__counts">
          {ingredients.length > 0 &&
            `${ingredients.length} ingrédient${ingredients.length > 1 ? 's' : ''}`}
          {ingredients.length > 0 && steps.length > 0 && ' · '}
          {steps.length > 0 &&
            `${steps.length} étape${steps.length > 1 ? 's' : ''}`}
        </p>
      )}

      {labels.length > 0 && (
        <div className="alcard__labels">
          {labels.map((l) => (
            <span key={l} className="alchip">
              {l}
            </span>
          ))}
        </div>
      )}

      <footer className="alcard__foot">
        <button
          className="alcard__menubtn"
          title="Plus d'actions"
          aria-haspopup="true"
          aria-expanded={menuOpen}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
        >
          ⋮
        </button>
      </footer>

      {menuOpen && (
        <>
          <div className="alcard__menu-backdrop" onClick={act(() => {})} />
          <div className="alcard__menu" onClick={(e) => e.stopPropagation()}>
            <div className="alcard__swatches">
              {CARD_COLORS.map((c) => (
                <button
                  key={c || 'none'}
                  className={`alswatch${recipe.color === c ? ' alswatch--on' : ''}${c ? '' : ' alswatch--none'}`}
                  style={c ? { background: c } : undefined}
                  title={c ? 'Couleur' : 'Sans couleur'}
                  onClick={act(() => onSetColor(recipe, c))}
                />
              ))}
            </div>
            <button
              className="almenu__item"
              onClick={act(() => onTogglePin(recipe))}
            >
              {recipe.pinned ? 'Désépingler' : 'Épingler'}
            </button>
            <button
              className="almenu__item"
              onClick={act(() => onDuplicate(recipe))}
            >
              Dupliquer
            </button>
            <button
              className="almenu__item"
              onClick={act(() => onArchive(recipe))}
            >
              Archiver
            </button>
            <button
              className="almenu__item almenu__item--danger"
              onClick={act(() => onDelete(recipe))}
            >
              Supprimer
            </button>
          </div>
        </>
      )}
    </article>
  );
}
