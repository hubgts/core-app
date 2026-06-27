import { useEffect, useState } from 'react';
import NetWorthChart from './NetWorthChart';
import {
  TYPE_META,
  formatEur,
  formatSignedEur,
  formatSignedPct,
  objectivePace,
  trendClass,
} from './constants';
import { frenchFullDate, frenchMonthYear, todayStr } from '../../utils/date';

/**
 * Détail d'une enveloppe en panneau off-canvas : solde courant, mise à jour,
 * objectif, statistiques, historique des relevés et courbe. `envelope` inclut
 * son `history`. `defaultAdding` déplie d'emblée le formulaire de mise à jour.
 */
export default function EnvelopeDrawer({
  envelope,
  defaultAdding = false,
  onUpdateSnapshot,
  onDeleteSnapshot,
  onUnarchive,
  onEdit,
  onClose,
}) {
  const [adding, setAdding] = useState(defaultAdding);
  const [amount, setAmount] = useState('');
  const [gain, setGain] = useState('');
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const meta = TYPE_META[envelope.type];
  const isInvest = envelope.type === 'investissement';
  const isPassif = envelope.nature === 'passif';
  const obj = envelope.objective;
  const objPct = obj ? Math.min(Math.max(obj.progressPct, 0), 100) : 0;
  const objLate = Boolean(
    obj && !obj.reached && ((obj.targetDate && obj.targetDate < todayStr()) || obj.paceStatus === 'behind'),
  );
  const pace = objectivePace(obj);
  const isArchived = envelope.status === 'archived';
  const history = envelope.history ?? [];
  // Courbe : relevés du plus ancien au plus récent.
  const chartData = [...history].sort((a, b) => a.date.localeCompare(b.date));

  async function submitSnapshot(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { amount: parseAmount(amount), note: note.trim() || null };
      if (isInvest && gain.trim() !== '') payload.gain = parseAmount(gain, true);
      await onUpdateSnapshot(date, payload);
      setAdding(false);
      setAmount('');
      setGain('');
      setNote('');
      setDate(todayStr());
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="drawer-overlay" onMouseDown={onClose}>
      <aside className="fdrawer" onMouseDown={(e) => e.stopPropagation()}>
        <header className="fdrawer__head" style={{ '--c': meta.color }}>
          <span className="fdrawer__icon">{envelope.icon || meta.icon}</span>
          <div className="fdrawer__headtext">
            <h2 className="fdrawer__title">{envelope.name}</h2>
            <p className="fdrawer__sub">
              {meta.label} · {isPassif ? 'Passif' : 'Actif'}
            </p>
          </div>
          <button className="fdrawer__close" onClick={onClose} aria-label="Fermer">✕</button>
        </header>

        {/* Bandeau de chiffres clés */}
        <div className="fdrawer__kpis">
          <div className="fkpi">
            <span className="fkpi__label">{isInvest ? 'Valeur' : 'Solde courant'}</span>
            <span className="fkpi__value">{formatEur(envelope.balance)}</span>
            {envelope.lastSnapshotDate && (
              <span className="fkpi__hint">au {frenchFullDate(envelope.lastSnapshotDate)}</span>
            )}
          </div>
          {isInvest && envelope.gain != null && (
            <>
              <div className="fkpi">
                <span className="fkpi__label">Plus-value</span>
                <span className={`fkpi__value t-${trendClass(envelope.gain)}`}>
                  {formatSignedEur(envelope.gain)}
                </span>
                <span className="fkpi__hint">capital {formatEur(envelope.investedCapital)}</span>
              </div>
              <div className="fkpi">
                <span className="fkpi__label">Performance</span>
                <span className={`fkpi__value t-${trendClass(envelope.performancePct)}`}>
                  {formatSignedPct(envelope.performancePct)}
                </span>
              </div>
            </>
          )}
          {!isInvest && envelope.lastVariation != null && (
            <div className="fkpi">
              <span className="fkpi__label">Depuis le relevé</span>
              <span className={`fkpi__value t-${trendClass(envelope.lastVariation)}`}>
                {formatSignedEur(envelope.lastVariation)}
              </span>
            </div>
          )}
          {envelope.totalChange != null && (
            <div className="fkpi">
              <span className="fkpi__label">Variation totale</span>
              <span className={`fkpi__value t-${trendClass(envelope.totalChange)}`}>
                {formatSignedEur(envelope.totalChange)}
              </span>
              {envelope.firstSnapshotDate && (
                <span className="fkpi__hint">depuis le {frenchFullDate(envelope.firstSnapshotDate)}</span>
              )}
            </div>
          )}
        </div>

        {obj && (
          <div className="fdrawer__objective">
            <div className="fprog">
              <div className="fprog__track">
                <div
                  className="fprog__fill"
                  style={{ width: `${objPct}%`, background: obj.reached ? '#34d399' : meta.color }}
                />
              </div>
              <div className="fprog__meta">
                <span className="fprog__nums">
                  {obj.reached
                    ? '✓ Objectif atteint'
                    : `${formatEur(envelope.balance ?? 0)} / ${formatEur(obj.targetAmount)} · reste ${formatEur(obj.remaining)}`}
                </span>
                {obj.targetDate && (
                  <span className={`fprog__date${objLate ? ' fprog__date--late' : ''}`}>
                    🎯 {frenchMonthYear(obj.targetDate)}
                  </span>
                )}
              </div>
              {pace && <div className={`fprog__pace t-${pace.tone}`}>{pace.text}</div>}
            </div>
          </div>
        )}

        {!adding ? (
          <button className="btn btn--primary fdrawer__update" onClick={() => setAdding(true)}>
            + Mettre à jour le solde
          </button>
        ) : (
          <form className="fdrawer__form" onSubmit={submitSnapshot}>
            <div className="ffield-row">
              <label className="ffield">
                <span className="ffield__label">{isInvest ? 'Valeur (€)' : 'Solde (€)'}</span>
                <input
                  className="ffield__input"
                  type="text"
                  inputMode="decimal"
                  autoFocus
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
            {isInvest && (
              <label className="ffield">
                <span className="ffield__label">Plus-value (€) — comprise dans la valeur</span>
                <input
                  className="ffield__input"
                  type="text"
                  inputMode="decimal"
                  value={gain}
                  placeholder="Optionnel (ex : 1500, ou -300)"
                  onChange={(e) => setGain(e.target.value)}
                />
              </label>
            )}
            <label className="ffield">
              <span className="ffield__label">Note (optionnel)</span>
              <input
                className="ffield__input"
                type="text"
                maxLength={500}
                value={note}
                placeholder="Ex : après virement prime"
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            {error && <p className="modal__error">{error}</p>}
            <div className="fdrawer__formactions">
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAdding(false)}>
                Annuler
              </button>
              <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
                {saving ? '…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        )}

        {chartData.length > 1 && (
          <div className="fdrawer__chart">
            <NetWorthChart
              data={chartData}
              valueKey="amount"
              color={meta.color}
              label={`Évolution de ${envelope.name}`}
            />
          </div>
        )}

        <div className="fdrawer__history">
          <h3 className="fdrawer__h3">Historique des relevés</h3>
          {history.length === 0 && <p className="fdrawer__empty">Aucun relevé.</p>}
          <ul className="fhist">
            {[...history].reverse().map((s) => (
              <li key={s.id} className="fhist__row">
                <span className="fhist__date">{frenchFullDate(s.date)}</span>
                <span className="fhist__amount">{formatEur(s.amount)}</span>
                {isInvest && s.gain != null && (
                  <span className={`fhist__gain t-${trendClass(s.gain)}`}>
                    PV {formatSignedEur(s.gain)}
                  </span>
                )}
                {s.variation != null && (
                  <span className={`fhist__var t-${trendClass(s.variation)}`}>
                    {formatSignedEur(s.variation)}
                  </span>
                )}
                <button
                  className="fhist__del"
                  onClick={() => onDeleteSnapshot(s.id)}
                  aria-label="Supprimer ce relevé"
                  title="Supprimer ce relevé"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="fdrawer__actions">
          <button className="btn btn--ghost btn--sm" onClick={() => onEdit(envelope)}>
            Éditer l'enveloppe
          </button>
          {isArchived && onUnarchive && (
            <button className="btn btn--ghost btn--sm" onClick={() => onUnarchive(envelope)}>
              Réactiver
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

function parseAmount(str, signed = false) {
  const cleaned = String(str).replace(/\s/g, '').replace(',', '.').trim();
  if (cleaned === '' || cleaned === '-') return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) throw new Error('Montant invalide.');
  return signed ? n : Math.abs(n);
}
