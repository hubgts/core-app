import { useState } from 'react';
import { frenchFullDate } from '../../utils/date';

/**
 * Carte d'une liste de courses sur le board (habillage façon Alimentation :
 * .alcard…). Affiche titre, date, progression « pris / total » et un menu.
 */
export default function ListCard({ list, onOpen, onEdit, onDuplicate, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ratio = list.itemCount > 0 ? list.checkedCount / list.itemCount : 0;

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
      onClick={() => onOpen(list.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(list.id);
        }
      }}
      aria-label={`${list.title}, ${list.checkedCount} sur ${list.itemCount} pris`}
    >
      <header className="alcard__head">
        <span className="alcard__type" style={{ '--c': '#4ade80' }}>
          <span className="alcard__type-icon">🛒</span>
          {list.date ? frenchFullDate(list.date) : 'Liste'}
        </span>
      </header>

      <h3 className="alcard__title">{list.title}</h3>

      <p className="alcard__meta">
        {list.checkedCount} / {list.itemCount} pris
        {list.hasImported && ' · recette'}
      </p>

      <div className="course-progress" aria-hidden="true">
        <div className="course-progress__bar" style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>

      <footer className="alcard__foot">
        <button
          className="alcard__menubtn"
          title="Plus d'actions"
          aria-haspopup="true"
          aria-expanded={menuOpen}
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
        >
          ⋮
        </button>
      </footer>

      {menuOpen && (
        <>
          <div className="alcard__menu-backdrop" onClick={act(() => {})} />
          <div className="alcard__menu" onClick={(e) => e.stopPropagation()}>
            <button className="almenu__item" onClick={act(() => onOpen(list.id))}>Ouvrir</button>
            <button className="almenu__item" onClick={act(() => onEdit(list))}>Modifier (titre, date)</button>
            <button className="almenu__item" onClick={act(() => onDuplicate(list))}>Dupliquer</button>
            <button className="almenu__item almenu__item--danger" onClick={act(() => onDelete(list))}>
              Supprimer
            </button>
          </div>
        </>
      )}
    </article>
  );
}
