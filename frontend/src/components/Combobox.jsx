import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './Combobox.css';

// Liste déroulante avec recherche intégrée (autocomplete) remplaçant le
// <select> natif, plus agréable au clavier comme au tactile.
//
// Props :
//   options     : [{ value, label, disabled? }]
//                 `value` est conservée telle quelle (string|number) et
//                 renvoyée brute à onChange — pas de conversion implicite.
//   value       : valeur sélectionnée (comparée via String()).
//   onChange    : (value) => void  — reçoit la `value` de l'option choisie.
//   placeholder : texte affiché quand aucune valeur n'est sélectionnée.
//   className   : classe appliquée au déclencheur (réutilise field__input,
//                 ffield__input, etc. pour hériter du style du formulaire).
//   block       : true (défaut) → occupe toute la largeur ; false → en ligne.
//   searchable  : force l'affichage du champ de recherche ; par défaut il
//                 n'apparaît qu'au-delà de 7 options.
//   id, title, disabled : passe-plats habituels.
export default function Combobox({
  options = [],
  value,
  onChange,
  placeholder = 'Sélectionner…',
  className = '',
  block = true,
  searchable,
  searchPlaceholder = 'Rechercher…',
  id,
  title,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  const selected = options.find((o) => String(o.value) === String(value));
  const showSearch = searchable ?? options.length > 7;

  const norm = (s) =>
    String(s ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  const q = norm(query.trim());
  const filtered = q
    ? options.filter((o) => norm(o.label).includes(q))
    : options;

  // Fermeture au clic extérieur.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) close();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // À l'ouverture : focus sur la recherche (ou la liste), curseur sur l'option
  // sélectionnée.
  useLayoutEffect(() => {
    if (!open) return;
    const idx = filtered.findIndex((o) => String(o.value) === String(value));
    setActive(idx >= 0 ? idx : 0);
    (showSearch ? searchRef.current : listRef.current)?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Maintient l'option active visible pendant la navigation clavier.
  useLayoutEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-i="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  function close() {
    setOpen(false);
    setQuery('');
  }

  function pick(opt) {
    if (!opt || opt.disabled) return;
    onChange?.(opt.value);
    close();
    triggerRef.current?.focus();
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(filtered[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
      triggerRef.current?.focus();
    } else if (e.key === 'Tab') {
      close();
    }
  }

  return (
    <div
      className={`combo${block ? '' : ' combo--inline'}${open ? ' is-open' : ''}`}
      ref={rootRef}
    >
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className={`combo__trigger ${className}`}
        title={title}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <span className={`combo__value${selected ? '' : ' combo__value--ph'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className="combo__chev"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          aria-hidden="true"
        >
          <path
            d="M3 5l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="combo__panel" onKeyDown={onKeyDown}>
          {showSearch && (
            <input
              ref={searchRef}
              className="combo__search"
              type="text"
              value={query}
              placeholder={searchPlaceholder}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
            />
          )}
          <div
            className="combo__list"
            ref={listRef}
            role="listbox"
            tabIndex={-1}
          >
            {filtered.length === 0 ? (
              <div className="combo__empty">Aucun résultat</div>
            ) : (
              filtered.map((o, i) => (
                <button
                  key={String(o.value)}
                  type="button"
                  data-i={i}
                  role="option"
                  aria-selected={String(o.value) === String(value)}
                  disabled={o.disabled}
                  className={
                    'combo__opt' +
                    (i === active ? ' is-active' : '') +
                    (String(o.value) === String(value) ? ' is-selected' : '')
                  }
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(o)}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
