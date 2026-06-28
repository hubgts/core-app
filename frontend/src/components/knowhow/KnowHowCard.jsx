import { useState } from 'react';
import {
  CARD_COLORS,
  formatDuration,
  formatQuantity,
  isSection,
} from './constants';

/**
 * Carte du board façon Google Keep : couleur de fond, catégorie, aperçu du
 * contenu, labels, épinglage et menu d'actions.
 */
export default function KnowHowCard({
  recipe,
  category,
  onOpen,
  onTogglePin,
  onSetColor,
  onDuplicate,
  onArchive,
  onDelete,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const { components = [], steps = [], labels = [] } = recipe;
  const previewComponents = components.filter((c) => !isSection(c)).slice(0, 3);

  const metaBits = [];
  if (recipe.yieldText) metaBits.push(recipe.yieldText);
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
      className="rcard"
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
      aria-label={`${recipe.title}, ${category.name}, ${components.length} composants, ${steps.length} étapes${recipe.pinned ? ', épinglé' : ''}`}
    >
      <header className="rcard__head">
        <span className="rcard__cat" style={{ '--c': category.color }}>
          <span className="rcard__cat-icon">{category.icon}</span>
          {category.name}
        </span>
        <button
          className={`rcard__pin${recipe.pinned ? ' rcard__pin--on' : ''}`}
          title={recipe.pinned ? 'Désépingler' : 'Épingler'}
          onClick={act(() => onTogglePin(recipe))}
        >
          {recipe.pinned ? '📌' : '📍'}
        </button>
      </header>

      <h3 className="rcard__title">{recipe.title}</h3>

      {metaBits.length > 0 && (
        <p className="rcard__meta">{metaBits.join(' · ')}</p>
      )}

      {previewComponents.length > 0 ? (
        <ul className="rcard__preview">
          {previewComponents.map((c) => (
            <li key={c.id}>
              {c.quantity != null && (
                <span className="rcard__qty">
                  {formatQuantity(c.quantity)}
                  {c.unit ? ` ${c.unit}` : ''}
                </span>
              )}{' '}
              {c.label}
            </li>
          ))}
          {components.length > previewComponents.length && (
            <li className="rcard__more">
              +{components.length - previewComponents.length} de plus…
            </li>
          )}
        </ul>
      ) : (
        <p className="rcard__counts">
          {components.length > 0 &&
            `${components.length} composant${components.length > 1 ? 's' : ''}`}
          {components.length > 0 && steps.length > 0 && ' · '}
          {steps.length > 0 &&
            `${steps.length} étape${steps.length > 1 ? 's' : ''}`}
        </p>
      )}

      {labels.length > 0 && (
        <div className="rcard__labels">
          {labels.map((l) => (
            <span key={l} className="rchip">
              {l}
            </span>
          ))}
        </div>
      )}

      <footer className="rcard__foot">
        <button
          className="rcard__menubtn"
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
          <div className="rcard__menu-backdrop" onClick={act(() => {})} />
          <div className="rcard__menu" onClick={(e) => e.stopPropagation()}>
            <div className="rcard__swatches">
              {CARD_COLORS.map((c) => (
                <button
                  key={c || 'none'}
                  className={`rswatch${recipe.color === c ? ' rswatch--on' : ''}${c ? '' : ' rswatch--none'}`}
                  style={c ? { background: c } : undefined}
                  title={c ? 'Couleur' : 'Sans couleur'}
                  onClick={act(() => onSetColor(recipe, c))}
                />
              ))}
            </div>
            <button
              className="rmenu__item"
              onClick={act(() => onTogglePin(recipe))}
            >
              {recipe.pinned ? 'Désépingler' : 'Épingler'}
            </button>
            <button
              className="rmenu__item"
              onClick={act(() => onDuplicate(recipe))}
            >
              Dupliquer
            </button>
            <button
              className="rmenu__item"
              onClick={act(() => onArchive(recipe))}
            >
              Archiver
            </button>
            <button
              className="rmenu__item rmenu__item--danger"
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
