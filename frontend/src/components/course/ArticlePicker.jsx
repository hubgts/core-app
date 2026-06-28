import { useEffect, useRef, useState } from 'react';
import { courseApi } from '../../api/course';

/**
 * Champ de désignation avec autocomplétion sur le référentiel d'articles.
 * Sélectionner un article renvoie `{ articleId, name, unit }` (mesure pré-remplie).
 * Une saisie inédite propose « Créer l'article » → renvoie `{ articleName: saisie }`.
 */
export default function ArticlePicker({
  value,
  onPick,
  placeholder,
  autoFocus,
}) {
  const [query, setQuery] = useState(value ?? '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    setQuery(value ?? '');
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(async () => {
      try {
        setResults(await courseApi.articles(query));
      } catch {
        setResults([]);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [query, open]);

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const trimmed = query.trim();
  const exact = results.find(
    (a) => a.name.toLowerCase() === trimmed.toLowerCase(),
  );

  function selectArticle(a) {
    setQuery(a.name);
    setOpen(false);
    onPick({ articleId: a.id, name: a.name, unit: a.unit });
  }

  function createNew() {
    if (!trimmed) return;
    setOpen(false);
    onPick({ articleName: trimmed, name: trimmed, unit: '' });
  }

  return (
    <div className="artpick" ref={boxRef}>
      <input
        className="field__input"
        value={query}
        placeholder={placeholder ?? 'Désignation…'}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && open) {
            e.preventDefault();
            if (exact) selectArticle(exact);
            else if (trimmed) createNew();
          }
        }}
      />
      {open && (results.length > 0 || (trimmed && !exact)) && (
        <ul className="artpick__menu">
          {results.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                className="artpick__opt"
                onMouseDown={() => selectArticle(a)}
              >
                <span>{a.name}</span>
                <span className="artpick__unit">{a.unit || ''}</span>
              </button>
            </li>
          ))}
          {trimmed && !exact && (
            <li>
              <button
                type="button"
                className="artpick__opt artpick__create"
                onMouseDown={createNew}
              >
                ✚ Créer l'article « {trimmed} »
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
