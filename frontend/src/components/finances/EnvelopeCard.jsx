import {
  TYPE_META,
  formatEur,
  formatSignedEur,
  formatSignedPct,
  formatDaysAgo,
  objectivePace,
  trendClass,
} from './constants';
import { frenchMonthYear, todayStr } from '../../utils/date';

/**
 * Carte d'enveloppe pour la page de gestion : solde, indicateur (perf / variation),
 * progression d'objectif (si défini) et mise à jour rapide du solde.
 * `onOpen(id, adding)` ouvre le drawer ; `adding=true` déplie le formulaire de solde.
 */
export default function EnvelopeCard({ envelope: e, onOpen }) {
  const meta = TYPE_META[e.type];
  const color = e.color || meta.color;
  const isInvest = e.type === 'investissement';
  const isPassif = e.nature === 'passif';
  const obj = e.objective;

  const amountStr =
    e.balance == null
      ? '—'
      : isPassif
        ? `−${formatEur(e.balance)}`
        : formatEur(e.balance);

  const pct = obj ? Math.min(Math.max(obj.progressPct, 0), 100) : 0;
  const late = Boolean(
    obj &&
    !obj.reached &&
    ((obj.targetDate && obj.targetDate < todayStr()) ||
      obj.paceStatus === 'behind'),
  );
  const pace = objectivePace(obj);

  return (
    <div
      className={`fecard${e.stale ? ' fecard--stale' : ''}`}
      style={{ '--c': color }}
    >
      <button className="fecard__main" onClick={() => onOpen(e.id, false)}>
        <span className="fecard__icon">{e.icon || meta.icon}</span>
        <span className="fecard__head">
          <span className="fecard__name">{e.name}</span>
          <span className="fecard__type">
            {meta.label}
            {e.lastSnapshotDate && (
              <span
                className={`fecard__fresh${e.stale ? ' fecard__fresh--stale' : ''}`}
              >
                {' · '}
                {e.stale ? '⚠ ' : ''}
                {formatDaysAgo(e.daysSinceUpdate)}
              </span>
            )}
          </span>
        </span>
        <span className="fecard__right">
          <span
            className={`fecard__amount${isPassif ? ' fecard__amount--neg' : ''}`}
          >
            {amountStr}
          </span>
          {isInvest && e.performancePct != null && (
            <span className={`fecard__perf t-${trendClass(e.performancePct)}`}>
              {formatSignedPct(e.performancePct)}
            </span>
          )}
          {!isInvest && e.lastVariation != null && (
            <span className={`fecard__perf t-${trendClass(e.lastVariation)}`}>
              {formatSignedEur(e.lastVariation)}
            </span>
          )}
        </span>
      </button>

      {obj && (
        <div className="fprog">
          <div className="fprog__track">
            <div
              className="fprog__fill"
              style={{
                width: `${pct}%`,
                background: obj.reached ? '#34d399' : color,
              }}
            />
          </div>
          <div className="fprog__meta">
            <span className="fprog__nums">
              {obj.reached
                ? '✓ Objectif atteint'
                : `${formatEur(e.balance ?? 0)} / ${formatEur(obj.targetAmount)} · reste ${formatEur(obj.remaining)}`}
            </span>
            {obj.targetDate && (
              <span
                className={`fprog__date${late ? ' fprog__date--late' : ''}`}
              >
                🎯 {frenchMonthYear(obj.targetDate)}
              </span>
            )}
          </div>
          {pace && (
            <div className={`fprog__pace t-${pace.tone}`}>{pace.text}</div>
          )}
        </div>
      )}

      <div className="fecard__actions">
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => onOpen(e.id, true)}
        >
          + Solde
        </button>
      </div>
    </div>
  );
}
