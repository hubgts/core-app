import { useEffect, useMemo, useRef, useState } from 'react';
import { referentialApi } from '../../api/referential';
import { todayStr } from '../../utils/date';
import { BET_TYPE_META, formatOdds, parseOdds } from './constants';
import { parseAmount } from './BankrollFormModal';

const EMPTY_SELECTION = { sport: '', event: '', market: '', pick: '', odds: '' };

/** Création d'un pari : simple (1 sélection) ou combiné (≥ 2 sélections). */
export default function BetFormModal({ onSave, onClose }) {
  const [type, setType] = useState('simple');
  const [stake, setStake] = useState('');
  const [placedAt, setPlacedAt] = useState(todayStr());
  const [selections, setSelections] = useState([{ ...EMPTY_SELECTION }]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [commission, setCommission] = useState('');
  const [closingOdds, setClosingOdds] = useState('');
  const [sports, setSports] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const stakeRef = useRef(null);

  useEffect(() => {
    referentialApi.list('sport').then(setSports).catch(() => setSports([]));
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Bascule simple ↔ combiné : ajuste le nombre minimal de sélections.
  function pickType(t) {
    setType(t);
    setSelections((prev) => {
      if (t === 'combine' && prev.length < 2) return [...prev, { ...EMPTY_SELECTION }];
      if (t === 'simple') return [prev[0] ?? { ...EMPTY_SELECTION }];
      return prev;
    });
  }

  function setSel(i, patch) {
    setSelections((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function addSel() {
    setSelections((prev) => [...prev, { ...EMPTY_SELECTION }]);
  }
  function removeSel(i) {
    setSelections((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Cote totale = produit des cotes saisies (combiné).
  const totalOdds = useMemo(() => {
    const factors = selections.map((s) => {
      const n = Number(String(s.odds).replace(',', '.'));
      return Number.isFinite(n) && n >= 1 ? n : null;
    });
    if (factors.some((f) => f == null)) return null;
    return factors.reduce((a, b) => a * b, 1);
  }, [selections]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        type,
        stake: parseAmount(stake),
        placedAt,
        selections: selections.map((s) => ({
          sport: s.sport.trim(),
          event: s.event.trim() || null,
          market: s.market.trim() || null,
          pick: s.pick.trim() || null,
          odds: parseOdds(s.odds),
        })),
      };
      if (type === 'simple') payload.odds = payload.selections[0].odds;
      if (commission.trim() !== '') payload.commission = parseAmount(commission);
      if (closingOdds.trim() !== '') payload.closingOdds = parseOdds(closingOdds);
      await onSave(payload);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal modal--lg" onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Nouveau pari</h2>

        <form onSubmit={submit}>
          <datalist id="sports-list">
            {sports.map((s) => (
              <option key={s.id} value={s.name} />
            ))}
          </datalist>

          {/* Type */}
          <div className="ffield">
            <span className="ffield__label">Type de pari</span>
            <div className="btiles">
              {Object.entries(BET_TYPE_META).map(([t, meta]) => (
                <button
                  type="button"
                  key={t}
                  className={`btile${t === type ? ' btile--active' : ''}`}
                  onClick={() => pickType(t)}
                >
                  <span className="btile__icon">{meta.icon}</span>
                  <span className="btile__label">{meta.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sélections */}
          <div className="ffield">
            <span className="ffield__label">
              {type === 'combine' ? `Sélections (${selections.length})` : 'Sélection'}
            </span>
            {selections.map((s, i) => (
              <div key={i} className="bseledit">
                <div className="bseledit__row">
                  <input
                    className="ffield__input"
                    list="sports-list"
                    placeholder="Sport (ex : MMA)"
                    value={s.sport}
                    onChange={(e) => setSel(i, { sport: e.target.value })}
                  />
                  <input
                    className="ffield__input bseledit__odds"
                    inputMode="decimal"
                    placeholder="Cote"
                    value={s.odds}
                    onChange={(e) => setSel(i, { odds: e.target.value })}
                  />
                  {type === 'combine' && selections.length > 2 && (
                    <button
                      type="button"
                      className="bseledit__del"
                      onClick={() => removeSel(i)}
                      aria-label="Retirer la sélection"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="bseledit__row">
                  <input
                    className="ffield__input"
                    placeholder="Évènement (ex : Jones vs Aspinall)"
                    value={s.event}
                    onChange={(e) => setSel(i, { event: e.target.value })}
                  />
                </div>
                <div className="bseledit__row">
                  <input
                    className="ffield__input"
                    placeholder="Marché (ex : Vainqueur)"
                    value={s.market}
                    onChange={(e) => setSel(i, { market: e.target.value })}
                  />
                  <input
                    className="ffield__input"
                    placeholder="Choix (ex : Jones)"
                    value={s.pick}
                    onChange={(e) => setSel(i, { pick: e.target.value })}
                  />
                </div>
              </div>
            ))}
            {type === 'combine' && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={addSel}>
                + Ajouter une sélection
              </button>
            )}
            {type === 'combine' && (
              <div className="btotalodds">
                Cote totale : <strong>{totalOdds != null ? formatOdds(totalOdds) : '—'}</strong>
              </div>
            )}
          </div>

          {/* Mise + date */}
          <div className="ffield-row">
            <label className="ffield">
              <span className="ffield__label">Mise (€)</span>
              <input
                ref={stakeRef}
                className="ffield__input"
                inputMode="decimal"
                value={stake}
                placeholder="Ex : 10"
                onChange={(e) => setStake(e.target.value)}
              />
            </label>
            <label className="ffield">
              <span className="ffield__label">Date du pari</span>
              <input
                className="ffield__input"
                type="date"
                value={placedAt}
                onChange={(e) => setPlacedAt(e.target.value)}
              />
            </label>
          </div>

          <button
            type="button"
            className="blink"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? '− Options avancées' : '+ Options avancées'}
          </button>
          {showAdvanced && (
            <div className="ffield-row">
              <label className="ffield">
                <span className="ffield__label">Commission (€)</span>
                <input
                  className="ffield__input"
                  inputMode="decimal"
                  value={commission}
                  placeholder="0"
                  onChange={(e) => setCommission(e.target.value)}
                />
              </label>
              <label className="ffield">
                <span className="ffield__label">Cote de clôture (CLV)</span>
                <input
                  className="ffield__input"
                  inputMode="decimal"
                  value={closingOdds}
                  placeholder="Optionnel"
                  onChange={(e) => setClosingOdds(e.target.value)}
                />
              </label>
            </div>
          )}

          <p className="ffield__hint">Le pari est créé « en cours ». Réglez-le depuis la liste des paris.</p>

          {error && <p className="modal__error">{error}</p>}

          <div className="modal__actions">
            <div className="modal__actions-right">
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                Annuler
              </button>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? '…' : 'Créer le pari'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
