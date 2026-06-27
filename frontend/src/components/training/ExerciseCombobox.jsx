import { useEffect, useRef, useState } from 'react';
import { referentialApi } from '../../api/referential';

const norm = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/**
 * Champ de saisie d'un exercice adossé au référentiel.
 * - tape pour filtrer les exercices existants ;
 * - si l'exercice n'existe pas, « Entrée » ou le bouton « Ajouter » le crée
 *   directement dans le référentiel (unicité gérée côté serveur).
 */
export default function ExerciseCombobox({ value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [highlight, setHighlight] = useState(0);
  const [adding, setAdding] = useState(false);
  const wrapRef = useRef(null);

  const query = value ?? '';
  const trimmed = query.trim();
  const exactMatch = options.some((o) => norm(o.name) === norm(trimmed));
  const canAdd = trimmed.length > 0 && !exactMatch;

  // Recherche dans le référentiel (debounce léger).
  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    const t = setTimeout(() => {
      referentialApi
        .list('exercise', trimmed)
        .then((rows) => alive && setOptions(rows))
        .catch(() => alive && setOptions([]));
    }, 150);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [trimmed, open]);

  // Fermeture au clic extérieur.
  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  const select = (name) => {
    onChange(name);
    setOpen(false);
  };

  const add = async () => {
    if (!canAdd || adding) return;
    setAdding(true);
    try {
      const created = await referentialApi.create('exercise', trimmed);
      select(created.name);
    } catch (err) {
      // 409 = déjà présent : on garde la saisie telle quelle.
      if (err.status === 409) select(trimmed);
    } finally {
      setAdding(false);
    }
  };

  // Liste affichée : options + ligne « Ajouter » éventuelle.
  const rows = [...options];
  const addIndex = canAdd ? rows.length : -1;

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, (canAdd ? rows.length : rows.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      // Ne jamais soumettre le formulaire depuis ce champ.
      e.preventDefault();
      if (highlight === addIndex) add();
      else if (rows[highlight]) select(rows[highlight].name);
      else if (canAdd) add();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="exo-combo" ref={wrapRef}>
      <input
        className="field__input"
        value={query}
        placeholder={placeholder ?? "Nom de l'exercice"}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && (rows.length > 0 || canAdd) && (
        <ul className="exo-combo__list">
          {rows.map((o, i) => (
            <li
              key={o.id}
              className={`exo-combo__opt${i === highlight ? ' is-active' : ''}`}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                select(o.name);
              }}
            >
              {o.name}
            </li>
          ))}
          {canAdd && (
            <li
              className={`exo-combo__opt exo-combo__add${addIndex === highlight ? ' is-active' : ''}`}
              onMouseEnter={() => setHighlight(addIndex)}
              onMouseDown={(e) => {
                e.preventDefault();
                add();
              }}
            >
              <span className="exo-combo__add-plus">＋</span>
              Ajouter «&nbsp;{trimmed}&nbsp;»
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
