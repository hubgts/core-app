import { useEffect, useRef, useState } from 'react';
import { todayStr } from '../../utils/date';
import Combobox from '../Combobox';
import { categoryOptions } from './constants';

/**
 * Saisie d'une transaction budget : dépense (rattachée à une catégorie) ou revenu.
 * `categories` = catégories actives. `onSave(payload)` persiste côté parent.
 */
export default function TransactionModal({
  categories,
  defaultKind = 'sortie',
  defaultCategoryId,
  defaultDate,
  transaction,
  onSave,
  onClose,
}) {
  const isEdit = Boolean(transaction);
  const [kind, setKind] = useState(transaction?.kind ?? defaultKind);
  const [amount, setAmount] = useState(
    transaction ? String(transaction.amount) : '',
  );
  const [date, setDate] = useState(
    transaction?.date ?? defaultDate ?? todayStr(),
  );
  const [categoryId, setCategoryId] = useState(
    transaction?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? '',
  );
  const [label, setLabel] = useState(transaction?.label ?? '');
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
    setError('');
    let value;
    try {
      value = parseAmount(amount);
      if (value <= 0) throw new Error('Le montant doit être supérieur à 0.');
    } catch (err) {
      setError(err.message);
      return;
    }
    if (kind === 'sortie' && !categoryId) {
      setError('Choisissez une catégorie pour la dépense.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        kind,
        amount: value,
        date,
        categoryId: kind === 'sortie' ? categoryId : null,
        label: label.trim() || null,
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="modal__title">
          {isEdit
            ? 'Modifier la transaction'
            : kind === 'entree'
              ? 'Nouveau revenu'
              : 'Nouvelle dépense'}
        </h2>

        <form onSubmit={submit}>
          <div className="ffield">
            <span className="ffield__label">Type</span>
            <div className="fseg">
              <button
                type="button"
                className={`fseg__btn${kind === 'sortie' ? ' fseg__btn--active' : ''}`}
                onClick={() => setKind('sortie')}
              >
                Dépense
              </button>
              <button
                type="button"
                className={`fseg__btn${kind === 'entree' ? ' fseg__btn--active' : ''}`}
                onClick={() => setKind('entree')}
              >
                Revenu
              </button>
            </div>
          </div>

          <div className="ffield-row">
            <label className="ffield">
              <span className="ffield__label">Montant (€)</span>
              <input
                ref={inputRef}
                className="ffield__input"
                type="text"
                inputMode="decimal"
                value={amount}
                placeholder="0"
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="ffield">
              <span className="ffield__label">Date</span>
              <input
                className="ffield__input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>

          {kind === 'sortie' && (
            <label className="ffield">
              <span className="ffield__label">Catégorie</span>
              <Combobox
                className="ffield__input"
                value={categoryId}
                onChange={setCategoryId}
                placeholder="Choisir une catégorie…"
                options={categoryOptions(categories)}
              />
            </label>
          )}

          <label className="ffield">
            <span className="ffield__label">Libellé (optionnel)</span>
            <input
              className="ffield__input"
              type="text"
              maxLength={120}
              value={label}
              placeholder="Ex : Courses, Loyer, Virement épargne…"
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>

          {error && <p className="modal__error">{error}</p>}

          <div className="modal__actions">
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

function parseAmount(str) {
  const cleaned = String(str).replace(/\s/g, '').replace(',', '.').trim();
  if (cleaned === '') return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) throw new Error('Montant invalide.');
  return Math.abs(n);
}
