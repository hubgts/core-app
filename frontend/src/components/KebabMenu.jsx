import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './KebabMenu.css';

// Bouton d'action secondaire (⋮) affiché en haut à droite des pages,
// à droite du bouton principal. Au clic, ouvre un menu déroulant listant
// les actions secondaires (gérer des catégories, des rayons, etc.).
//
// Props :
//   actions : [{ label, icon?, to?, onClick? }]
//             - `to`      → rendu en <Link> (navigation)
//             - `onClick` → rendu en <button> (action)
//   label   : libellé accessible du bouton (aria-label / title)
export default function KebabMenu({ actions, label = 'Actions secondaires' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!actions || actions.length === 0) return null;

  return (
    <div className="kebab" ref={ref}>
      <button
        type="button"
        className="kebab__btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <circle cx="9" cy="3" r="1.6" fill="currentColor" />
          <circle cx="9" cy="9" r="1.6" fill="currentColor" />
          <circle cx="9" cy="15" r="1.6" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div className="kebab__menu" role="menu">
          {actions.map((a, i) =>
            a.to ? (
              <Link
                key={i}
                className="kebab__item"
                role="menuitem"
                to={a.to}
                onClick={() => setOpen(false)}
              >
                {a.icon && <span className="kebab__icon">{a.icon}</span>}
                {a.label}
              </Link>
            ) : (
              <button
                key={i}
                type="button"
                className="kebab__item"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  a.onClick?.();
                }}
              >
                {a.icon && <span className="kebab__icon">{a.icon}</span>}
                {a.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
