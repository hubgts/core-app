import { useCallback, useEffect, useMemo, useState } from 'react';
import { healthApi } from '../api/health';
import { confirmDialog } from '../components/dialogs';
import MetricChart from '../components/health/MetricChart';
import Sparkline from '../components/health/Sparkline';
import MeasurementFormModal from '../components/health/MeasurementFormModal';
import GoalModal from '../components/health/GoalModal';
import ProfileModal from '../components/health/ProfileModal';
import {
  HEALTH_COLOR,
  TREND_COLOR,
  PERIODS,
  metricMeta,
  formatMetric,
  formatSignedMetric,
  deltaClass,
} from '../components/health/constants';
import {
  addDaysStr,
  frenchFullDate,
  frenchDayMonth,
  todayStr,
} from '../utils/date';
import './HealthPage.css';
import { toast } from '../components/toast';
import EmptyState from '../components/EmptyState';

export default function HealthPage() {
  const today = todayStr();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [metric, setMetric] = useState('weight');
  const [period, setPeriod] = useState('3months');

  const [measureModal, setMeasureModal] = useState(null); // { measurement? } | null
  const [goalModal, setGoalModal] = useState(false);
  const [profileModal, setProfileModal] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setData(await healthApi.overview(today));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  // Métriques disponibles dans la barre : poids + mensurations suivies.
  const availableMetrics = useMemo(
    () => ['weight', ...(data?.profile.metrics ?? [])],
    [data],
  );

  // S'assure que la métrique sélectionnée existe encore.
  useEffect(() => {
    if (!availableMetrics.includes(metric)) setMetric('weight');
  }, [availableMetrics, metric]);

  // Série filtrée sur la période.
  const chartData = useMemo(() => {
    const series = data?.series?.[metric] ?? [];
    const p = PERIODS.find((x) => x.id === period);
    if (!p || p.days === Infinity) return series;
    const cutoff = addDaysStr(today, -p.days);
    return series.filter((s) => s.date >= cutoff);
  }, [data, metric, period, today]);

  if (loading) {
    return (
      <div className="hpage">
        <div className="hpage__loading">Chargement…</div>
      </div>
    );
  }

  const o = data;
  const goal = o?.goal;
  const kpis = o?.kpis;
  const isWeight = metric === 'weight';
  const meta = metricMeta(metric);
  const dir = goal?.direction ?? null;

  // Objectif → props du graphe (ligne + point ETA), uniquement sur le poids.
  const chartGoal =
    isWeight && goal
      ? {
          target: goal.targetWeightKg,
          eta:
            goal.eta && goal.paceStatus !== 'reached'
              ? { date: goal.eta, value: goal.targetWeightKg }
              : null,
        }
      : null;

  // Édition d'une mesure depuis l'historique ou un point du graphe.
  function editByDate(date) {
    const m = o.measurements.find((x) => x.date === date);
    if (m) setMeasureModal({ measurement: m });
  }

  async function saveMeasurement(date, payload) {
    const next = await healthApi.setMeasurement(date, payload, today);
    setData(next);
    setMeasureModal(null);
    toast('Mesure enregistrée.');
    maybeCelebrate(next);
  }

  async function deleteMeasurement(measurement) {
    if (
      !(await confirmDialog({
        message: `Supprimer la mesure du ${frenchDayMonth(measurement.date)} ?`,
        danger: true,
      }))
    )
      return;
    const next = await healthApi.removeMeasurement(measurement.id, today);
    setData(next);
    setMeasureModal(null);
    toast('Mesure supprimée.');
  }

  async function saveGoal(payload) {
    const next = await healthApi.setGoal(payload, today);
    setData(next);
    setGoalModal(false);
    toast('Objectif enregistré.');
  }

  async function clearGoal() {
    const next = await healthApi.clearGoal(today);
    setData(next);
    setGoalModal(false);
    toast('Objectif retiré.');
  }

  async function saveProfile(payload) {
    const next = await healthApi.updateProfile(payload, today);
    setData(next);
    setProfileModal(false);
    toast('Réglages enregistrés.');
  }

  // Célébration au franchissement de l'objectif.
  function maybeCelebrate(next) {
    if (next.goal?.paceStatus === 'reached' && goal?.paceStatus !== 'reached') {
      toast(
        `🎯 Objectif ${formatMetric(next.goal.targetWeightKg, 'weight')} atteint !`,
      );
    }
  }

  const hasData = (o.series.weight ?? []).length > 0;

  return (
    <div className="hpage">
      {/* En-tête */}
      <header className="page-head">
        <div>
          <h1 className="page-head__title">📏 Mensuration</h1>
          <p className="page-head__subtitle">
            Poids &amp; mensurations qui évoluent avec le muscle — tendance et
            objectif.
          </p>
        </div>
        <div className="page__headactions">
          <button
            className="btn btn--ghost"
            onClick={() => setProfileModal(true)}
          >
            ⚙︎ Réglages
          </button>
          <button
            className="btn btn--primary"
            onClick={() => setMeasureModal({})}
          >
            + Mesure
          </button>
        </div>
      </header>

      {error && <p className="hpage__error">{error}</p>}

      {!hasData ? (
        <EmptyState
          icon="⚖️"
          title="Enregistre ta première pesée"
          action={
            <button
              className="btn btn--primary"
              onClick={() => setMeasureModal({})}
            >
              + Première mesure
            </button>
          }
        >
          Le poids du jour est bruité : c'est la{' '}
          <strong>tendance lissée</strong> dans le temps qui compte. Note ton
          poids régulièrement pour voir la courbe se dessiner.
        </EmptyState>
      ) : (
        <>
          {/* KPIs */}
          <section className="hkpis">
            <div className="hkpi hkpi--hero">
              <span className="hkpi__label">
                Poids actuel <em>(tendance)</em>
              </span>
              <span className="hkpi__value">
                {formatMetric(kpis.currentWeightKg, 'weight')}
              </span>
              {kpis.lastRawWeightKg != null && (
                <span className="hkpi__hint">
                  dernière pesée {formatMetric(kpis.lastRawWeightKg, 'weight')}
                </span>
              )}
            </div>
            <Delta label="7 jours" value={kpis.delta7Kg} dir={dir} />
            <Delta label="30 jours" value={kpis.delta30Kg} dir={dir} />
            <Delta
              label="Depuis le début"
              value={kpis.deltaTotalKg}
              dir={dir}
            />
            {kpis.bmi != null ? (
              <div className="hkpi">
                <span className="hkpi__label">IMC</span>
                <span className="hkpi__value hkpi__value--sm">{kpis.bmi}</span>
                <span className="hkpi__hint">{kpis.bmiLabel}</span>
              </div>
            ) : (
              <button
                className="hkpi hkpi--cta"
                onClick={() => setProfileModal(true)}
              >
                <span className="hkpi__label">IMC</span>
                <span className="hkpi__value hkpi__value--sm">+ taille</span>
                <span className="hkpi__hint">renseigner pour l'IMC</span>
              </button>
            )}
          </section>

          {/* Barre de contrôle : métrique + période */}
          <div className="hcontrol">
            <div className="hseg hseg--scroll">
              {availableMetrics.map((m) => {
                const mm = metricMeta(m);
                return (
                  <button
                    key={m}
                    className={`hseg__btn${metric === m ? ' hseg__btn--active' : ''}`}
                    onClick={() => setMetric(m)}
                  >
                    {mm.icon} {mm.short}
                  </button>
                );
              })}
            </div>
            <div className="hseg">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  className={`hseg__btn${period === p.id ? ' hseg__btn--active' : ''}`}
                  onClick={() => setPeriod(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Graphe + colonne objectif */}
          <section className="hmain">
            <div className="hcard hcard--chart">
              <div className="hcard__head">
                <h2 className="hcard__title">
                  {meta.icon} {meta.label}
                </h2>
                <div className="hlegend">
                  <span className="hlegend__item">
                    <i
                      className="hlegend__line"
                      style={{ background: TREND_COLOR }}
                    />{' '}
                    tendance
                  </span>
                  <span className="hlegend__item">
                    <i className="hlegend__dot" /> pesée
                  </span>
                  {chartGoal && (
                    <span className="hlegend__item">
                      <i className="hlegend__goal" /> objectif
                    </span>
                  )}
                </div>
              </div>
              {chartData.length < 2 && (
                <p className="hcard__note">
                  Pas assez de points sur cette période pour une tendance
                  fiable.
                </p>
              )}
              <MetricChart
                data={chartData}
                metricKey={metric}
                color={TREND_COLOR}
                goal={chartGoal}
                label={`Évolution ${meta.label}`}
                onPointClick={isWeight ? editByDate : undefined}
              />
            </div>

            <GoalPanel
              goal={goal}
              isWeight={isWeight}
              onEdit={() => setGoalModal(true)}
            />
          </section>

          {/* Mensurations (sparklines) */}
          {o.profile.metrics.length > 0 && (
            <section className="hcard">
              <h2 className="hcard__title">Mensurations</h2>
              <div className="hsparks">
                {o.profile.metrics.map((k) => {
                  const sum = o.metricSummary[k] ?? {};
                  const mm = metricMeta(k);
                  return (
                    <button
                      key={k}
                      className={`hsparkcard${metric === k ? ' hsparkcard--active' : ''}`}
                      onClick={() => setMetric(k)}
                    >
                      <div className="hsparkcard__head">
                        <span className="hsparkcard__name">
                          {mm.icon} {mm.short}
                        </span>
                        {sum.delta != null && (
                          <span
                            className={`hsparkcard__delta t-${deltaClass(sum.delta, null)}`}
                          >
                            {formatSignedMetric(sum.delta, k)}
                          </span>
                        )}
                      </div>
                      <Sparkline
                        data={o.series[k] ?? []}
                        color={HEALTH_COLOR}
                      />
                      <span className="hsparkcard__value">
                        {formatMetric(sum.last, k)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Historique */}
          <section className="hcard">
            <h2 className="hcard__title">Historique</h2>
            <ul className="hhist">
              {[...o.measurements].reverse().map((m, i, arr) => {
                const prev = arr[i + 1];
                const wdelta =
                  m.weightKg != null && prev?.weightKg != null
                    ? Math.round((m.weightKg - prev.weightKg) * 10) / 10
                    : null;
                return (
                  <li key={m.id}>
                    <button
                      className="hhist__row"
                      onClick={() => setMeasureModal({ measurement: m })}
                    >
                      <span className="hhist__date">
                        {frenchFullDate(m.date)}
                      </span>
                      <span className="hhist__weight">
                        {m.weightKg != null
                          ? formatMetric(m.weightKg, 'weight')
                          : '—'}
                      </span>
                      {wdelta != null && (
                        <span
                          className={`hhist__delta t-${deltaClass(wdelta, dir)}`}
                        >
                          {formatSignedMetric(wdelta, 'weight')}
                        </span>
                      )}
                      {Object.keys(m.values).length > 0 && (
                        <span className="hhist__tag" title="mensurations">
                          📏 {Object.keys(m.values).length}
                        </span>
                      )}
                      {m.note && (
                        <span className="hhist__note" title={m.note}>
                          📝
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      {measureModal && (
        <MeasurementFormModal
          measurement={measureModal.measurement}
          metrics={o.profile.metrics}
          today={today}
          onSave={saveMeasurement}
          onDelete={deleteMeasurement}
          onClose={() => setMeasureModal(null)}
        />
      )}

      {goalModal && (
        <GoalModal
          goal={goal}
          currentWeight={kpis?.currentWeightKg}
          today={today}
          onSave={saveGoal}
          onClear={clearGoal}
          onClose={() => setGoalModal(false)}
        />
      )}

      {profileModal && (
        <ProfileModal
          profile={o.profile}
          onSave={saveProfile}
          onClose={() => setProfileModal(false)}
        />
      )}
    </div>
  );
}

function Delta({ label, value, dir }) {
  return (
    <div className="hkpi">
      <span className="hkpi__label">Δ {label}</span>
      <span
        className={`hkpi__value hkpi__value--sm t-${deltaClass(value, dir)}`}
      >
        {value != null ? formatSignedMetric(value, 'weight') : '—'}
      </span>
    </div>
  );
}

// Bloc objectif : progression, rythme, ETA, statut — ou CTA si aucun objectif.
function GoalPanel({ goal, isWeight, onEdit }) {
  if (!isWeight) {
    return (
      <div className="hcard hgoal hgoal--muted">
        <p className="hgoal__hint">
          L'objectif porte sur le <strong>poids</strong>. Sélectionne « Poids »
          pour le suivre ici.
        </p>
      </div>
    );
  }
  if (!goal) {
    return (
      <div className="hcard hgoal hgoal--empty">
        <span className="hgoal__icon">🎯</span>
        <h3 className="hgoal__title">Fixe-toi un cap</h3>
        <p className="hgoal__hint">
          Un objectif de poids, une progression honnête, une date estimée.
        </p>
        <button className="btn btn--primary btn--sm" onClick={onEdit}>
          Définir un objectif
        </button>
      </div>
    );
  }

  const pct = goal.progress != null ? Math.round(goal.progress * 100) : 0;
  const reached = goal.paceStatus === 'reached';

  return (
    <div className={`hcard hgoal${reached ? ' hgoal--reached' : ''}`}>
      <div className="hgoal__top">
        <h3 className="hgoal__title">
          🎯 {formatMetric(goal.targetWeightKg, 'weight')}
        </h3>
        <button
          className="hgoal__edit"
          onClick={onEdit}
          aria-label="Modifier l'objectif"
        >
          ✎
        </button>
      </div>

      <div className="hgoal__bar">
        <span className="hgoal__fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="hgoal__pctrow">
        <span className="hgoal__pct">{pct} %</span>
        {goal.remainingKg != null && !reached && (
          <span className="hgoal__remaining">
            reste {formatMetric(goal.remainingKg, 'weight')}
          </span>
        )}
      </div>

      {reached ? (
        <p className="hgoal__status hgoal__status--ok">
          ✅ Objectif atteint, bravo !
        </p>
      ) : (
        <ul className="hgoal__facts">
          {goal.weeklyRateKg != null && (
            <li>
              <span className="hgoal__factlabel">Rythme</span>
              <span className="hgoal__factval">
                {goal.weeklyRateKg > 0 ? '+' : '−'}
                {Math.abs(goal.weeklyRateKg).toFixed(2)} kg/sem
              </span>
            </li>
          )}
          <li>
            <span className="hgoal__factlabel">Estimation</span>
            <span className="hgoal__factval">
              {goal.eta
                ? `🎯 ${frenchDayMonth(goal.eta)}`
                : '— (rythme inverse)'}
            </span>
          </li>
          {goal.targetDate && (
            <li>
              <span className="hgoal__factlabel">Échéance</span>
              <span
                className={`hgoal__factval ${goal.paceStatus === 'behind' ? 't-down' : 't-up'}`}
              >
                {goal.paceStatus === 'on_track' && '✅ dans les temps'}
                {goal.paceStatus === 'behind' &&
                  `⚠️ +${goal.requiredWeeklyKg?.toFixed(2)} kg/sem requis`}
                {goal.paceStatus === 'no_pace' && '—'}
              </span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
