import { useEffect, useRef, useState } from 'react';
import { ICONS, TYPE_META, TYPE_ORDER } from './constants';
import { todayStr } from '../../utils/date';

/**
 * Création (choix du type + solde initial) ou édition (nom/icône/couleur).
 * Le type est immuable après création.
 */
export default function EnvelopeFormModal({ envelope, onSave, onArchive, onDelete, onClose }) {
  const isEdit = Boolean(envelope);
  const [type, setType] = useState(envelope?.type ?? 'compte_courant');
  const [name, setName] = useState(envelope?.name ?? '');
  const [icon, setIcon] = useState(envelope?.icon || TYPE_META[envelope?.type ?? 'compte_courant'].icon);
  const [color, setColor] = useState(envelope?.color ?? TYPE_META['compte_courant'].color);
  const [initialAmount, setInitialAmount] = useState('');
  const [initialGain, setInitialGain] = useState('');
  const [initialDate, setInitialDate] = useState(todayStr());
  const [targetAmount, setTargetAmount] = useState(
    envelope?.targetAmount != null ? String(envelope.targetAmount) : '',
  );
  const [targetDate, setTargetDate] = useState(envelope?.targetDate ?? '');
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

  // À la création, changer de type ajuste l'icône/couleur par défaut.
  function pickType(t) {
    setType(t);
    if (!icon || ICONS.includes(icon) === false || icon === TYPE_META[type].icon) {
      setIcon(TYPE_META[t].icon);
    }
    setColor(TYPE_META[t].color);
  }

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Le nom est obligatoire.');
      return;
    }
    setSaving(true);
    setError('');
    // Objectif : vide = pas d'objectif (null pour effacer côté backend).
    const target = {
      targetAmount: targetAmount.trim() === '' ? null : parseAmount(targetAmount),
      targetDate: targetDate || null,
    };
    try {
      if (isEdit) {
        await onSave({ name: name.trim(), icon, color, ...target });
      } else {
        const payload = {
          type,
          name: name.trim(),
          icon,
          color,
          initialAmount: parseAmount(initialAmount),
          initialDate,
          ...target,
        };
        if (type === 'investissement' && initialGain.trim() !== '') {
          payload.initialGain = parseAmount(initialGain, true);
        }
        await onSave(payload);
      }
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="modal__title">{isEdit ? "Modifier l'enveloppe" : 'Nouvelle enveloppe'}</h2>

        <form onSubmit={submit}>
          {!isEdit && (
            <div className="ffield">
              <span className="ffield__label">Type</span>
              <div className="ftiles">
                {TYPE_ORDER.map((t) => (
                  <button
                    type="button"
                    key={t}
                    className={`ftile${t === type ? ' ftile--active' : ''}`}
                    style={{ '--c': TYPE_META[t].color }}
                    onClick={() => pickType(t)}
                  >
                    <span className="ftile__icon">{TYPE_META[t].icon}</span>
                    <span className="ftile__label">{TYPE_META[t].label}</span>
                  </button>
                ))}
              </div>
              <span className="ffield__hint">
                {type === 'dette'
                  ? 'Passif : ce solde sera soustrait de votre patrimoine net.'
                  : 'Actif : ce solde s’ajoute à votre patrimoine.'}
              </span>
            </div>
          )}

          <label className="ffield">
            <span className="ffield__label">Nom</span>
            <input
              ref={inputRef}
              className="ffield__input"
              type="text"
              maxLength={60}
              value={name}
              placeholder="Ex : Épargne vacances, PEA Bourse…"
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          {!isEdit && (
            <div className="ffield-row">
              <label className="ffield">
                <span className="ffield__label">
                  {type === 'investissement' ? 'Valeur initiale (€)' : 'Solde initial (€)'}
                </span>
                <input
                  className="ffield__input"
                  type="text"
                  inputMode="decimal"
                  value={initialAmount}
                  placeholder="0"
                  onChange={(e) => setInitialAmount(e.target.value)}
                />
              </label>
              <label className="ffield">
                <span className="ffield__label">Date</span>
                <input
                  className="ffield__input"
                  type="date"
                  value={initialDate}
                  onChange={(e) => setInitialDate(e.target.value)}
                />
              </label>
            </div>
          )}

          {!isEdit && type === 'investissement' && (
            <label className="ffield">
              <span className="ffield__label">Plus-value initiale (€) — comprise dans la valeur</span>
              <input
                className="ffield__input"
                type="text"
                inputMode="decimal"
                value={initialGain}
                placeholder="Optionnel (ex : 1500, ou -300 en cas de perte)"
                onChange={(e) => setInitialGain(e.target.value)}
              />
            </label>
          )}

          <div className="ffield">
            <span className="ffield__label">Icône</span>
            <div className="fpicker">
              {ICONS.map((ic) => (
                <button
                  type="button"
                  key={ic}
                  className={`fpicker__emoji${ic === icon ? ' fpicker__emoji--active' : ''}`}
                  onClick={() => setIcon(ic)}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div className="ffield">
            <span className="ffield__label">Objectif (optionnel)</span>
            <div className="ffield-row">
              <label className="ffield">
                <span className="ffield__label">Montant cible (€)</span>
                <input
                  className="ffield__input"
                  type="text"
                  inputMode="decimal"
                  value={targetAmount}
                  placeholder="Ex : 10000"
                  onChange={(e) => setTargetAmount(e.target.value)}
                />
              </label>
              <label className="ffield">
                <span className="ffield__label">Échéance</span>
                <input
                  className="ffield__input"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </label>
            </div>
            <span className="ffield__hint">
              Laissez vide pour ne pas fixer d'objectif. La progression s'affiche sur la
              carte de l'enveloppe.
            </span>
          </div>

          {error && <p className="modal__error">{error}</p>}

          <div className="modal__actions">
            {isEdit && (
              <div className="modal__actions-left">
                <button type="button" className="btn btn--ghost" onClick={() => onArchive(envelope)}>
                  Archiver
                </button>
                <button type="button" className="btn btn--danger" onClick={() => onDelete(envelope)}>
                  Supprimer
                </button>
              </div>
            )}
            <div className="modal__actions-right">
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                Annuler
              </button>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? '…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Parse "8 200,50" / "8200.5" → 8200.5. `signed` autorise le signe négatif.
function parseAmount(str, signed = false) {
  const cleaned = String(str).replace(/\s/g, '').replace(',', '.').trim();
  if (cleaned === '' || cleaned === '-') return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) throw new Error('Montant invalide.');
  return signed ? n : Math.abs(n);
}
