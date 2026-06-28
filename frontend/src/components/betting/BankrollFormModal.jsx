import { useEffect, useRef, useState } from 'react';
import { BANKROLL_COLORS, BANKROLL_ICONS } from './constants';

/** Création (nom + capital de départ) ou édition (nom/bookmaker/icône/couleur). */
export default function BankrollFormModal({
  bankroll,
  onSave,
  onArchive,
  onDelete,
  onClose,
}) {
  const isEdit = Boolean(bankroll);
  const [name, setName] = useState(bankroll?.name ?? '');
  const [startingCapital, setStartingCapital] = useState(
    bankroll ? String(bankroll.startingCapital) : '',
  );
  const [bookmaker, setBookmaker] = useState(bankroll?.bookmaker ?? '');
  const [icon, setIcon] = useState(bankroll?.icon || BANKROLL_ICONS[0]);
  const [color, setColor] = useState(bankroll?.color || BANKROLL_COLORS[0]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Le nom est obligatoire.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await onSave({
          name: name.trim(),
          bookmaker: bookmaker.trim(),
          icon,
          color,
        });
      } else {
        await onSave({
          name: name.trim(),
          startingCapital: parseAmount(startingCapital),
          bookmaker: bookmaker.trim(),
          icon,
          color,
        });
      }
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="modal__title">
          {isEdit ? 'Modifier la bankroll' : 'Nouvelle bankroll'}
        </h2>

        <form onSubmit={submit}>
          <label className="ffield">
            <span className="ffield__label">Nom</span>
            <input
              ref={inputRef}
              className="ffield__input"
              type="text"
              maxLength={60}
              value={name}
              placeholder="Ex : MMA 2026, Foot value…"
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          {!isEdit && (
            <label className="ffield">
              <span className="ffield__label">Capital de départ (€)</span>
              <input
                className="ffield__input"
                type="text"
                inputMode="decimal"
                value={startingCapital}
                placeholder="Ex : 100"
                onChange={(e) => setStartingCapital(e.target.value)}
              />
              <span className="ffield__hint">
                Base de la progression. Non modifiable ensuite : utilisez les
                dépôts / retraits.
              </span>
            </label>
          )}

          <label className="ffield">
            <span className="ffield__label">Bookmaker (optionnel)</span>
            <input
              className="ffield__input"
              type="text"
              maxLength={60}
              value={bookmaker}
              placeholder="Ex : Winamax, Unibet…"
              onChange={(e) => setBookmaker(e.target.value)}
            />
          </label>

          <div className="ffield">
            <span className="ffield__label">Icône</span>
            <div className="bpicker">
              {BANKROLL_ICONS.map((ic) => (
                <button
                  type="button"
                  key={ic}
                  className={`bpicker__emoji${ic === icon ? ' bpicker__emoji--active' : ''}`}
                  onClick={() => setIcon(ic)}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div className="ffield">
            <span className="ffield__label">Couleur</span>
            <div className="bswatches">
              {BANKROLL_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`bswatch${c === color ? ' bswatch--active' : ''}`}
                  style={{ '--c': c }}
                  onClick={() => setColor(c)}
                  aria-label={`Couleur ${c}`}
                />
              ))}
            </div>
          </div>

          {error && <p className="modal__error">{error}</p>}

          <div className="modal__actions">
            {isEdit && (
              <div className="modal__actions-left">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => onArchive(bankroll)}
                >
                  Archiver
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={() => onDelete(bankroll)}
                >
                  Supprimer
                </button>
              </div>
            )}
            <div className="modal__actions-right">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={onClose}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={saving}
              >
                {saving ? '…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Parse "8 200,50" / "8200.5" → 8200.5.
export function parseAmount(str) {
  const cleaned = String(str).replace(/\s/g, '').replace(',', '.').trim();
  if (cleaned === '' || cleaned === '-') return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) throw new Error('Montant invalide.');
  return Math.abs(n);
}
