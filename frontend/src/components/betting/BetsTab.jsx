import { useState } from 'react';
import {
  BET_TYPE_META,
  SELECTION_STATUS_META,
  SETTLE_STATUSES,
  STATUS_META,
  formatEur,
  formatOdds,
  formatSignedEur,
  sportIcon,
  trendClass,
} from './constants';
import { promptDialog } from '../dialogs';
import { frenchDayMonth } from '../../utils/date';
import Combobox from '../Combobox';

const FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'pending', label: 'En cours' },
  { id: 'won', label: 'Gagnés' },
  { id: 'lost', label: 'Perdus' },
];

/** Onglet « Paris » : liste filtrable de cartes claires avec règlement contextuel. */
export default function BetsTab({
  bankroll,
  filter,
  onFilter,
  onAddBet,
  onSettleBet,
  onSettleSelection,
  onDeleteBet,
}) {
  const bets = bankroll.bets.filter(
    (b) => filter === 'all' || b.status === filter,
  );

  return (
    <div className="btab">
      <div className="btab__bar">
        <div className="bfilters">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`bfilter${filter === f.id ? ' bfilter--active' : ''}`}
              onClick={() => onFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button className="btn btn--primary btn--sm" onClick={onAddBet}>
          + Pari
        </button>
      </div>

      {bets.length === 0 ? (
        <p className="btab__empty">
          {bankroll.bets.length === 0
            ? "Aucun pari pour l'instant."
            : 'Aucun pari pour ce filtre.'}
        </p>
      ) : (
        <ul className="bbetlist">
          {bets.map((bet) => (
            <BetCard
              key={bet.id}
              bet={bet}
              onSettleBet={onSettleBet}
              onSettleSelection={onSettleSelection}
              onDeleteBet={onDeleteBet}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function BetCard({ bet, onSettleBet, onSettleSelection, onDeleteBet }) {
  const meta = STATUS_META[bet.status];
  const isPending = bet.status === 'pending';
  const [editing, setEditing] = useState(false);
  const showActions = isPending || editing;

  async function settle(status) {
    if (status === 'cashout') {
      const raw = await promptDialog({
        title: 'Montant récupéré au cash out (€)',
        defaultValue: String(bet.stake),
      });
      if (raw == null) return;
      const amount = Number(String(raw).replace(',', '.'));
      if (!Number.isFinite(amount) || amount < 0) return;
      onSettleBet(bet.id, { status, cashoutAmount: amount });
    } else {
      onSettleBet(bet.id, { status });
    }
    setEditing(false);
  }

  return (
    <li className={`bbet bbet--${meta.tone}`}>
      <div className="bbet__head">
        <span className={`bpill bpill--${bet.status}`}>
          {meta.icon} {meta.label}
        </span>
        <span className="bbet__type">
          {BET_TYPE_META[bet.type].icon} {BET_TYPE_META[bet.type].label}
        </span>
        <span className="bbet__date">{frenchDayMonth(bet.placedAt)}</span>
      </div>

      {/* Sélections */}
      <ul className="bbet__sels">
        {bet.selections.map((sel) => (
          <li key={sel.id} className="bsel">
            <span className="bsel__sport">{sportIcon(sel.sport)}</span>
            <span className="bsel__main">
              <span className="bsel__pick">
                {sel.pick || sel.market || sel.sport}
              </span>
              {(sel.event || sel.market) && (
                <span className="bsel__meta">
                  {[sel.event, sel.pick ? sel.market : null]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              )}
            </span>
            <span className="bsel__odds">{formatOdds(sel.odds)}</span>
            {bet.type === 'combine' && (
              <Combobox
                className={`bsel__status t-${selTone(sel.status)}`}
                block={false}
                value={sel.status}
                onChange={(v) => onSettleSelection(sel.id, v)}
                title="Statut de la sélection"
                options={Object.entries(SELECTION_STATUS_META).map(
                  ([v, m]) => ({
                    value: v,
                    label: `${m.icon} ${m.label}`,
                  }),
                )}
              />
            )}
          </li>
        ))}
      </ul>

      {/* Chiffres clés */}
      <div className="bbet__metrics">
        <Metric label="Mise" value={formatEur(bet.stake)} />
        <Metric label="Cote" value={formatOdds(bet.odds)} />
        {isPending ? (
          <Metric
            label="Gain potentiel"
            value={formatSignedEur(round2(bet.stake * (bet.odds - 1)))}
            tone="up"
          />
        ) : bet.status === 'cancelled' ? (
          <Metric label="" value="Exclu des statistiques" muted />
        ) : (
          <>
            <Metric label="Retour" value={formatEur(bet.payout)} />
            <Metric
              label="Bénéfice"
              value={formatSignedEur(bet.profit)}
              tone={trendClass(bet.profit)}
              strong
            />
          </>
        )}
        <button
          className="bbet__del"
          onClick={() => onDeleteBet(bet)}
          aria-label="Supprimer le pari"
          title="Supprimer"
        >
          🗑
        </button>
      </div>

      {/* Actions de règlement */}
      {showActions ? (
        <div className="bbet__actions">
          {SETTLE_STATUSES.map((st) => (
            <button
              key={st}
              className={`bchip${bet.status === st ? ' bchip--active' : ''}`}
              onClick={() => settle(st)}
            >
              {STATUS_META[st].icon} {STATUS_META[st].label}
            </button>
          ))}
          {!isPending && (
            <button
              className="bchip"
              onClick={() => {
                onSettleBet(bet.id, { status: 'pending' });
                setEditing(false);
              }}
            >
              ⏳ Rouvrir
            </button>
          )}
          {editing && (
            <button
              className="bchip bchip--ghost"
              onClick={() => setEditing(false)}
            >
              Annuler
            </button>
          )}
        </div>
      ) : (
        <button className="bbet__edit" onClick={() => setEditing(true)}>
          Modifier le résultat
        </button>
      )}
    </li>
  );
}

function Metric({ label, value, tone, strong, muted }) {
  return (
    <div className={`bmetric${muted ? ' bmetric--muted' : ''}`}>
      {label && <span className="bmetric__label">{label}</span>}
      <span
        className={`bmetric__value${strong ? ' bmetric__value--strong' : ''}${tone ? ` t-${tone}` : ''}`}
      >
        {value}
      </span>
    </div>
  );
}

function selTone(status) {
  if (status === 'won') return 'up';
  if (status === 'lost') return 'down';
  return 'flat';
}

const round2 = (n) => Math.round(n * 100) / 100;
