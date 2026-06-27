import { useEffect, useRef, useState } from 'react';

/**
 * Réglage de l'objectif de patrimoine net global (#10) : montant cible + échéance,
 * tous deux optionnels. Vider le montant efface l'objectif.
 */
export default function NetObjectiveModal({ settings, onSave, onClose }) {
  const [target, setTarget] = useState(
    settings?.netWorthTarget != null ? String(settings.netWorthTarget) : '',
  );
  const [date, setDate] = useState(settings?.netWorthTargetDate ?? '');
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
    setSaving(true);
    setError('');
    try {
      await onSave({
        netWorthTarget: target.trim() === '' ? null : parseAmount(target),
        netWorthTargetDate: date || null,
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Objectif de patrimoine net</h2>
        <form onSubmit={submit}>
          <div className="ffield-row">
            <label className="ffield">
              <span className="ffield__label">Montant cible (€)</span>
              <input
                ref={inputRef}
                className="ffield__input"
                type="text"
                inputMode="decimal"
                value={target}
                placeholder="Ex : 100000"
                onChange={(e) => setTarget(e.target.value)}
              />
            </label>
            <label className="ffield">
              <span className="ffield__label">Échéance</span>
              <input
                className="ffield__input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>
          <span className="ffield__hint">
            Laissez le montant vide pour supprimer l'objectif global.
          </span>

          {error && <p className="modal__error">{error}</p>}

          <div className="modal__actions">
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

function parseAmount(str) {
  const cleaned = String(str).replace(/\s/g, '').replace(',', '.').trim();
  if (cleaned === '') return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) throw new Error('Montant invalide.');
  return n;
}
