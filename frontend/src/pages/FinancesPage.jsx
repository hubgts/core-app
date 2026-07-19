import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { financesApi } from '../api/finances';
import NetWorthChart from '../components/finances/NetWorthChart';
import StackedAreaChart from '../components/finances/StackedAreaChart';
import Donut from '../components/finances/Donut';
import NetObjectiveModal from '../components/finances/NetObjectiveModal';
import {
  TYPE_META,
  formatEur,
  formatSignedEur,
  formatSignedPct,
  objectivePace,
  trendClass,
} from '../components/finances/constants';
import { frenchMonthYear, todayStr } from '../utils/date';
import './FinancesPage.css';
import './EnvelopesPage.css';

const PERIODS = [
  { id: 3, label: '3M' },
  { id: 6, label: '6M' },
  { id: 12, label: '12M' },
  { id: 60, label: 'Tout' },
];

const PROJ_HORIZONS = [
  { id: 0, label: 'Aucune' },
  { id: 12, label: '+1 an' },
  { id: 36, label: '+3 ans' },
  { id: 60, label: '+5 ans' },
];

export default function FinancesPage() {
  const today = todayStr();
  const [months, setMonths] = useState(12);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartMode, setChartMode] = useState('net'); // 'net' | 'composition'
  const [repartMode, setRepartMode] = useState('type'); // 'type' | 'envelope'
  const [projMonths, setProjMonths] = useState(36); // horizon de projection (mois)
  const [objModal, setObjModal] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await financesApi.overview(months, today, projMonths);
      setOverview(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [months, today, projMonths]);

  async function saveObjective(data) {
    await financesApi.updateSettings(data);
    setObjModal(false);
    await load();
  }

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Parts du donut de répartition, selon le mode (par type ou par enveloppe).
  const repartSlices = useMemo(() => {
    if (!overview) return [];
    if (repartMode === 'envelope') {
      return (overview.repartitionByEnvelope ?? []).map((r) => ({
        key: r.id,
        label: r.name,
        color: r.color || TYPE_META[r.type]?.color,
        total: r.total,
        pct: r.pct,
      }));
    }
    return (overview.repartition ?? []).map((r) => ({
      key: r.type,
      label: TYPE_META[r.type]?.label ?? r.type,
      color: TYPE_META[r.type]?.color,
      total: r.total,
      pct: r.pct,
    }));
  }, [overview, repartMode]);

  if (loading) {
    return (
      <div className="fpage">
        <div className="fpage__loading">Chargement…</div>
      </div>
    );
  }

  const o = overview;
  const variation = o?.variation;
  const kpis = o?.kpis;
  const netObj = o?.netObjective;
  const netObjPct = netObj ? Math.min(Math.max(netObj.progressPct, 0), 100) : 0;
  const netPace = objectivePace(netObj);
  const staleCount = (o?.envelopes ?? []).filter((e) => e.stale).length;

  // Légende de la projection (épargne moyenne mensuelle → patrimoine projeté).
  let projCaption;
  if (o?.monthlySavings == null) {
    projCaption = "Pas assez d'historique pour projeter.";
  } else {
    const proj = o.projection ?? [];
    const last = proj.length ? proj[proj.length - 1] : null;
    const rate = `Épargne moyenne ${formatSignedEur(o.monthlySavings)}/mois`;
    projCaption =
      projMonths > 0 && last
        ? `${rate} → ${formatEur(last.net)} projeté ${PROJ_HORIZONS.find((p) => p.id === projMonths)?.label ?? ''}`
        : rate;
  }

  return (
    <div className="fpage">
      <header className="page-head">
        <div>
          <h1 className="page-head__title">💰 Finances</h1>
          <p className="page-head__subtitle">
            Ton patrimoine net et tes objectifs en un coup d'œil.
          </p>
        </div>
      </header>

      {error && <p className="fpage__error">{error}</p>}

      {o && (
        <>
          {/* Bandeau patrimoine net + plus-values */}
          <section className="fhero">
            <div className="fhero__net">
              <span className="fhero__label">Patrimoine net</span>
              <span className="fhero__value">{formatEur(o.netWorth)}</span>
              {variation && (
                <span
                  className={`fhero__delta t-${trendClass(variation.amount)}`}
                >
                  {formatSignedEur(variation.amount)}
                  {variation.pct != null &&
                    ` (${formatSignedPct(variation.pct)})`}
                  <span className="fhero__deltahint">
                    {' '}
                    depuis le {variation.fromDate}
                  </span>
                </span>
              )}
            </div>

            {o.plusValueTotal !== 0 && (
              <div className="fhero__pv">
                <span className="fhero__label">Plus-values latentes</span>
                <span
                  className={`fhero__pvvalue t-${trendClass(o.plusValueTotal)}`}
                >
                  {formatSignedEur(o.plusValueTotal)}
                </span>
                {o.performancePct != null && (
                  <span className="fhero__pvhint">
                    {formatSignedPct(o.performancePct)} sur investissements
                  </span>
                )}
              </div>
            )}

            <div className="fhero__brut">
              <div>
                <span className="fhero__label">Actifs</span>
                <span className="fhero__small">{formatEur(o.grossAssets)}</span>
              </div>
              <div>
                <span className="fhero__label">Passifs</span>
                <span className="fhero__small t-down">
                  {o.totalLiabilities
                    ? `−${formatEur(o.totalLiabilities)}`
                    : formatEur(0)}
                </span>
              </div>
            </div>
          </section>

          {/* Rappel de fraîcheur (#2) */}
          {staleCount > 0 && (
            <Link className="freminder" to="/finances/bilan">
              ⚠ {staleCount} enveloppe{staleCount > 1 ? 's' : ''} à actualiser —
              faire le bilan →
            </Link>
          )}

          {/* KPIs temporels (#8) + objectif net global (#10) */}
          <section className="fstats">
            {kpis && (
              <div className="fkpis">
                <div className="fkpicell">
                  <span className="fkpicell__label">Depuis le 1ᵉʳ janvier</span>
                  <span
                    className={`fkpicell__value t-${trendClass(kpis.ytd.amount)}`}
                  >
                    {formatSignedEur(kpis.ytd.amount)}
                  </span>
                </div>
                <div className="fkpicell">
                  <span className="fkpicell__label">Sur 12 mois</span>
                  <span
                    className={`fkpicell__value t-${trendClass(kpis.oneYear.amount)}`}
                  >
                    {formatSignedEur(kpis.oneYear.amount)}
                  </span>
                </div>
                {kpis.allTimeHigh && (
                  <div className="fkpicell">
                    <span className="fkpicell__label">
                      Plus haut historique
                    </span>
                    <span className="fkpicell__value">
                      {formatEur(kpis.allTimeHigh.amount)}
                    </span>
                    <span className="fkpicell__hint">
                      au {kpis.allTimeHigh.date}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="fcard fnetobj">
              <div className="fcard__head">
                <h2 className="fcard__title">Objectif de patrimoine net</h2>
                <button
                  className="fsumlink fsumlink--btn"
                  onClick={() => setObjModal(true)}
                >
                  {netObj ? 'Modifier' : 'Définir'}
                </button>
              </div>
              {netObj ? (
                <div className="fprog">
                  <div className="fprog__track">
                    <div
                      className="fprog__fill"
                      style={{
                        width: `${netObjPct}%`,
                        background: netObj.reached ? '#34d399' : '#818cf8',
                      }}
                    />
                  </div>
                  <div className="fprog__meta">
                    <span className="fprog__nums">
                      {netObj.reached
                        ? '✓ Objectif atteint'
                        : `${formatEur(o.netWorth)} / ${formatEur(netObj.target)} · reste ${formatEur(netObj.remaining)}`}
                    </span>
                    {netObj.targetDate && (
                      <span className="fprog__date">
                        🎯 {frenchMonthYear(netObj.targetDate)}
                      </span>
                    )}
                  </div>
                  {netPace && (
                    <div className={`fprog__pace t-${netPace.tone}`}>
                      {netPace.text}
                    </div>
                  )}
                </div>
              ) : (
                <p className="fempty fnetobj__empty">
                  Aucun objectif. Fixez un montant cible (et une échéance) pour
                  suivre votre progression globale.
                </p>
              )}
            </div>
          </section>

          {/* Courbe d'évolution + répartition */}
          <section className="fgrid">
            <div className="fcard fcard--chart">
              <div className="fcard__head">
                <div className="fseg">
                  <button
                    className={`fseg__btn${chartMode === 'net' ? ' fseg__btn--active' : ''}`}
                    onClick={() => setChartMode('net')}
                  >
                    Net
                  </button>
                  <button
                    className={`fseg__btn${chartMode === 'composition' ? ' fseg__btn--active' : ''}`}
                    onClick={() => setChartMode('composition')}
                  >
                    Composition
                  </button>
                </div>
                <div className="fseg">
                  {PERIODS.map((p) => (
                    <button
                      key={p.id}
                      className={`fseg__btn${months === p.id ? ' fseg__btn--active' : ''}`}
                      onClick={() => setMonths(p.id)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              {chartMode === 'net' ? (
                <>
                  <NetWorthChart
                    data={o.evolution}
                    valueKey="net"
                    projection={projMonths > 0 ? o.projection : null}
                  />
                  <div className="fprojbar">
                    <div className="fseg">
                      {PROJ_HORIZONS.map((p) => (
                        <button
                          key={p.id}
                          className={`fseg__btn${projMonths === p.id ? ' fseg__btn--active' : ''}`}
                          onClick={() => setProjMonths(p.id)}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <span className="fproj__caption">{projCaption}</span>
                  </div>
                </>
              ) : (
                <StackedAreaChart data={o.evolutionByType} />
              )}
            </div>

            <div className="fcard fcard--donut">
              <div className="fcard__head">
                <h2 className="fcard__title">Répartition des actifs</h2>
                <div className="fseg">
                  <button
                    className={`fseg__btn${repartMode === 'type' ? ' fseg__btn--active' : ''}`}
                    onClick={() => setRepartMode('type')}
                  >
                    Type
                  </button>
                  <button
                    className={`fseg__btn${repartMode === 'envelope' ? ' fseg__btn--active' : ''}`}
                    onClick={() => setRepartMode('envelope')}
                  >
                    Enveloppe
                  </button>
                </div>
              </div>
              <Link
                className="fdonutlink"
                to="/finances/enveloppes"
                title="Gérer mes enveloppes"
              >
                <Donut
                  slices={repartSlices}
                  gross={o.grossAssets}
                  label="Répartition des actifs"
                  centerSub="actifs"
                />
              </Link>
              <Link
                className="fsumlink fdonut__manage"
                to="/finances/enveloppes"
              >
                Gérer mes enveloppes →
              </Link>
            </div>
          </section>
        </>
      )}

      {objModal && (
        <NetObjectiveModal
          settings={
            netObj
              ? {
                  netWorthTarget: netObj.target,
                  netWorthTargetDate: netObj.targetDate,
                }
              : null
          }
          onSave={saveObjective}
          onClose={() => setObjModal(false)}
        />
      )}
    </div>
  );
}
