import { useState } from 'react';

/**
 * Saisie d'étiquettes : tape un libellé puis Entrée (ou virgule) pour l'ajouter.
 * `value` = tableau de chaînes ; `onChange` reçoit le nouveau tableau.
 */
export default function TagInput({ value, onChange, placeholder }) {
  const [draft, setDraft] = useState('');

  const add = (raw) => {
    const tag = raw.trim();
    if (!tag) return;
    const exists = value.some((t) => t.toLowerCase() === tag.toLowerCase());
    if (!exists) onChange([...value, tag]);
    setDraft('');
  };

  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      remove(value.length - 1);
    }
  };

  return (
    <div className="tag-input">
      {value.map((tag, i) => (
        <span key={`${tag}-${i}`} className="tag-chip">
          {tag}
          <button
            type="button"
            className="tag-chip__del"
            onClick={() => remove(i)}
            aria-label={`Retirer ${tag}`}
          >
            ✕
          </button>
        </span>
      ))}
      <input
        className="tag-input__field"
        value={draft}
        placeholder={
          value.length ? '' : (placeholder ?? 'Ajouter une étiquette…')
        }
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
      />
    </div>
  );
}
