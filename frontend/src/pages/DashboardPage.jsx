import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { habitsApi } from '../api/habits';
import { trainingApi } from '../api/training';
import { financesApi } from '../api/finances';
import NetWorthChart from '../components/finances/NetWorthChart';
import {
  formatEur,
  formatSignedEur,
  formatSignedPct,
  trendClass,
} from '../components/finances/constants';
import {
  addDaysStr,
  frenchDayMonth,
  frenchFullDate,
  mondayOf,
  todayStr,
  weekdayInitial,
} from '../utils/date';
import { formatDuration } from '../utils/format';
import './DashboardPage.css';

const COLORS = { habits: '#34d399', accent: '#38bdf8' };
const TRAINING_TYPE = {
  musculation: { icon: '💪', label: 'Muscu' },
  cardio: { icon: '🏃', label: 'Cardio' },
  autre: { icon: '📝', label: 'Autre' },
};

// Petit anneau de progression.
function Ring({ ratio, color, size = 54, children }) {
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(ratio, 1));
  const c = size / 2;
  return (
    <div className="dring-wrap" style={{ width: size, height: size }}>
      <svg
        className="dring"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle className="dring__bg" cx={c} cy={c} r={r} />
        <circle
          className="dring__fg"
          cx={c}
          cy={c}
          r={r}
          stroke={color}
          strokeDasharray={`${circ * clamped} ${circ}`}
          transform={`rotate(-90 ${c} ${c})`}
        />
      </svg>
      {children && <span className="dring__label">{children}</span>}
    </div>
  );
}

// Complétion des habitudes sur une plage de jours (respecte la date de création
// et l'objectif hebdo, sans compter les jours futurs).
function habitCompletion(habits, checks, from, to, today) {
  const end = to < today ? to : today;
  let expected = 0;
  let done = 0;
  for (const h of habits) {
    const created = h.createdAt.slice(0, 10);
    let eligible = 0;
    let hDone = 0;
    for (let d = from; d <= end; d = addDaysStr(d, 1)) {
      if (d < created) continue;
      eligible += 1;
      if (checks.has(`${h.id}|${d}`)) hDone += 1;
    }
    const hExpected = (h.weeklyTarget * eligible) / 7;
    expected += hExpected;
    done += Math.min(hDone, hExpected);
  }
  return expected ? Math.round((done / expected) * 100) : null;
}

// Sens de la tendance 30 j d'une enveloppe (favorable selon sa nature).
function envTrend(env) {
  const t = env.trend30;
  if (!t) return { cls: 'flat', arrow: '·', text: 'historique récent' };
  if (t.amount === 0) return { cls: 'flat', arrow: '→', text: 'stable' };
  const up = t.amount > 0;
  const favorable = env.nature === 'passif' ? !up : up;
  return {
    cls: favorable ? 'up' : 'down',
    arrow: up ? '↑' : '↓',
    text: `${formatSignedEur(t.amount)}${t.pct != null ? ` (${formatSignedPct(t.pct)})` : ''}`,
  };
}

// ============================================================================
// Bloc Patrimoine global (résumé + courbe 12 mois) — partagé
// ============================================================================
function PatrimoinePanel({ finances, navigate }) {
  const v = finances.variation;
  const oneYear = finances.kpis?.oneYear;
  const obj = finances.netObjective;
  return (
    <button
      className="dpanel dpanel--finances dpanel--chart"
      onClick={() => navigate('/finances')}
      aria-label="Patrimoine"
    >
      <div className="dpanel__head">
        <h2 className="dpanel__title">Patrimoine global</h2>
        <span className="dpanel__hint">12 mois</span>
      </div>
      <div className="dnet">
        <span className="dnet__value">{formatEur(finances.netWorth)}</span>
        <span className="dnet__unit">net</span>
      </div>
      <div className="dcard__meta">
        {v && (
          <span className={`dchip t-${trendClass(v.amount)}`}>
            ce mois {formatSignedEur(v.amount)}
            {v.pct != null && ` (${formatSignedPct(v.pct)})`}
          </span>
        )}
        {oneYear && (
          <span className={`dchip t-${trendClass(oneYear.amount)}`}>
            1 an {formatSignedEur(oneYear.amount)}
          </span>
        )}
        {obj && (
          <span className={`dchip${obj.reached ? ' t-up' : ''}`}>
            🎯 {Math.round(obj.progressPct)} % de {formatEur(obj.target)}
          </span>
        )}
      </div>
      <NetWorthChart
        data={finances.evolution}
        valueKey="net"
        color={COLORS.accent}
      />
    </button>
  );
}

// ============================================================================
// Bloc Enveloppes (partagé entre les deux filtres)
// ============================================================================
function EnvelopesPanel({ finances, navigate }) {
  const envelopes = finances.envelopes ?? [];
  return (
    <button
      className="dpanel dpanel--finances"
      onClick={() => navigate('/finances')}
      aria-label="Finances"
    >
      <div className="dpanel__head">
        <h2 className="dpanel__title">Mes enveloppes</h2>
        <span className="dpanel__hint">
          {formatEur(finances.netWorth)} net · tendance 30 j
        </span>
      </div>
      {envelopes.length > 0 ? (
        <ul className="denvs">
          {envelopes.map((e) => {
            const t = envTrend(e);
            return (
              <li key={e.id} className="denv">
                <span
                  className="denv__icon"
                  style={{ background: e.color || 'var(--surface-3)' }}
                >
                  {e.icon || '💼'}
                </span>
                <span className="denv__name">{e.name}</span>
                <span className="denv__bal">
                  {e.balance != null ? formatEur(e.balance) : '—'}
                </span>
                <span className={`denv__trend t-${t.cls}`}>
                  <span className="denv__arrow">{t.arrow}</span> {t.text}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="dcard__empty">Crée ta première enveloppe.</p>
      )}
    </button>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const today = todayStr();
  const weekFrom = useMemo(() => mondayOf(today), [today]);
  const weekTo = useMemo(() => addDaysStr(weekFrom, 6), [weekFrom]);

  const [tab, setTab] = useState('today'); // 'today' | 'week'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const checksFrom = weekFrom <= today ? weekFrom : today;
      const checksTo = weekTo >= today ? weekTo : today;
      const [habits, weekChecks, events, finances] = await Promise.all([
        habitsApi.list(today),
        habitsApi.checksInRange(checksFrom, checksTo),
        trainingApi.events(weekFrom, weekTo),
        financesApi.overview(12, today),
      ]);
      setData({
        habits,
        checks: new Set(weekChecks.map((c) => `${c.habitId}|${c.date}`)),
        events,
        finances,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [today, weekFrom, weekTo]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="dash">
      <header className="dash__head">
        <div className="dash__greet">
          <h1 className="dash__title">
            Bonjour Emilien <span className="dash__wave">👋</span>
          </h1>
          <span className="dash__date">{frenchFullDate(today)}</span>
        </div>
        <div className="dtabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'today'}
            className={`dtabs__btn${tab === 'today' ? ' dtabs__btn--active' : ''}`}
            onClick={() => setTab('today')}
          >
            Aujourd'hui
          </button>
          <button
            role="tab"
            aria-selected={tab === 'week'}
            className={`dtabs__btn${tab === 'week' ? ' dtabs__btn--active' : ''}`}
            onClick={() => setTab('week')}
          >
            Semaine
          </button>
        </div>
      </header>

      {error && <p className="dash__error">{error}</p>}

      {!data ? (
        loading && <div className="dash__loading">Chargement…</div>
      ) : tab === 'today' ? (
        <TodayView data={data} today={today} navigate={navigate} />
      ) : (
        <WeekView
          data={data}
          today={today}
          weekFrom={weekFrom}
          weekTo={weekTo}
          navigate={navigate}
        />
      )}
    </div>
  );
}

// ============================================================================
// Filtre « Aujourd'hui »
// ============================================================================
function TodayView({ data, today, navigate }) {
  const { habits, checks, events, finances } = data;

  const doneToday = habits.filter((h) => checks.has(`${h.id}|${today}`)).length;
  const totalHabits = habits.length;
  const todaySessions = events.filter((e) => e.date === today);
  const todayDuration = formatDuration(
    todaySessions.reduce((s, e) => s + (e.durationMin || 0), 0),
  );

  const summary = [
    totalHabits > 0 ? `${doneToday}/${totalHabits} habitudes` : null,
    todaySessions.length > 0
      ? `${todaySessions.length} séance${todaySessions.length > 1 ? 's' : ''}`
      : 'repos',
  ].filter(Boolean);

  return (
    <>
      <p className="dash__summary">{summary.join(' · ')}</p>

      <section className="dgrid2">
        {/* Habitudes du jour — renseignées ou non */}
        <button
          className="dpanel dpanel--habits"
          onClick={() => navigate('/habitudes')}
          aria-label="Habitudes"
        >
          <div className="dpanel__head">
            <h2 className="dpanel__title">Habitudes du jour</h2>
            <span className="dpanel__hint">
              {doneToday}/{totalHabits} faites
            </span>
          </div>
          {habits.length > 0 ? (
            <ul className="dtoday">
              {habits.map((h) => {
                const done = checks.has(`${h.id}|${today}`);
                return (
                  <li key={h.id} className="dtoday__row">
                    <span
                      className={`dtoday__dot${done ? ' dtoday__dot--on' : ''}`}
                      style={
                        done
                          ? { background: h.color, borderColor: h.color }
                          : { borderColor: h.color }
                      }
                    >
                      {done ? '✓' : ''}
                    </span>
                    <span
                      className={`dtoday__name${done ? ' dtoday__name--on' : ''}`}
                    >
                      {h.icon ? `${h.icon} ` : ''}
                      {h.name}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="dcard__empty">Aucune habitude définie.</p>
          )}
        </button>

        {/* Séance du jour ou repos */}
        <button
          className="dpanel dpanel--session"
          onClick={() => navigate('/entrainement')}
          aria-label="Entraînement"
        >
          <div className="dpanel__head">
            <h2 className="dpanel__title">Séance du jour</h2>
            <span className="dpanel__hint">
              {todaySessions.length
                ? (todayDuration ??
                  `${todaySessions.length} séance${todaySessions.length > 1 ? 's' : ''}`)
                : 'repos'}
            </span>
          </div>
          {todaySessions.length > 0 ? (
            <ul className="dsessions">
              {todaySessions.map((s) => (
                <li key={s.id} className="dsession">
                  <span className="dsession__icon">
                    {TRAINING_TYPE[s.type].icon}
                  </span>
                  <span className="dsession__body">
                    <span className="dsession__title">
                      {s.title || TRAINING_TYPE[s.type].label}
                      {s.zone ? ` · ${s.zone}` : ''}
                    </span>
                    {(s.exercises?.length > 0 || s.description) && (
                      <span className="dsession__sub">
                        {s.exercises?.length > 0
                          ? `${s.exercises.length} exercice${s.exercises.length > 1 ? 's' : ''}`
                          : s.description}
                      </span>
                    )}
                  </span>
                  {s.durationMin && (
                    <span className="dsession__dur">
                      {formatDuration(s.durationMin)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="dpanel__rest">
              <span className="dpanel__resticon">🌙</span>
              <p className="dcard__empty">
                Jour de repos. Profites-en pour récupérer.
              </p>
            </div>
          )}
        </button>
      </section>

      <section className="dfin">
        <PatrimoinePanel finances={finances} navigate={navigate} />
        <EnvelopesPanel finances={finances} navigate={navigate} />
      </section>
    </>
  );
}

// ============================================================================
// Filtre « Semaine »
// ============================================================================
function WeekView({ data, today, weekFrom, weekTo, navigate }) {
  const { habits, checks, events, finances } = data;

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysStr(weekFrom, i)),
    [weekFrom],
  );
  const completion = useMemo(
    () => habitCompletion(habits, checks, weekFrom, weekTo, today),
    [habits, checks, weekFrom, weekTo, today],
  );
  const weekSessions = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const totalDuration = formatDuration(
    weekSessions.reduce((s, e) => s + (e.durationMin || 0), 0),
  );

  const summary = [
    completion != null ? `habitudes ${completion} %` : null,
    `${weekSessions.length} séance${weekSessions.length > 1 ? 's' : ''}`,
  ].filter(Boolean);

  return (
    <>
      <p className="dash__summary">
        {frenchDayMonth(weekFrom)} – {frenchDayMonth(weekTo)} ·{' '}
        {summary.join(' · ')}
      </p>

      <section className="dgrid2">
        {/* Habitudes de la semaine — renseignées jour par jour */}
        <button
          className="dpanel dpanel--habits"
          onClick={() => navigate('/habitudes')}
          aria-label="Habitudes"
        >
          <div className="dpanel__head">
            <h2 className="dpanel__title">Habitudes de la semaine</h2>
            <Ring
              ratio={(completion ?? 0) / 100}
              color={COLORS.habits}
              size={34}
            >
              {completion != null ? `${completion}%` : '—'}
            </Ring>
          </div>
          {habits.length > 0 ? (
            <>
              <div className="dwk__legend">
                <span className="dwk__name" />
                <span className="dwk__dots">
                  {weekDates.map((d) => (
                    <span key={d} className="dwk__dayhead">
                      {weekdayInitial(...d.split('-').map(Number))}
                    </span>
                  ))}
                </span>
                <span className="dwk__count">obj.</span>
              </div>
              <ul className="dwks">
                {habits.map((h) => {
                  const created = h.createdAt.slice(0, 10);
                  let count = 0;
                  return (
                    <li key={h.id} className="dwk">
                      <span className="dwk__name">
                        {h.icon ? `${h.icon} ` : ''}
                        {h.name}
                      </span>
                      <span className="dwk__dots">
                        {weekDates.map((d) => {
                          const done = checks.has(`${h.id}|${d}`);
                          if (done) count += 1;
                          const future = d > today;
                          const before = d < created;
                          const cls = done
                            ? ' dwk__dot--on'
                            : future || before
                              ? ' dwk__dot--off'
                              : ' dwk__dot--miss';
                          return (
                            <span
                              key={d}
                              className={`dwk__dot${cls}`}
                              style={
                                done
                                  ? {
                                      background: h.color,
                                      borderColor: h.color,
                                    }
                                  : undefined
                              }
                              title={d}
                            >
                              {done ? '✓' : ''}
                            </span>
                          );
                        })}
                      </span>
                      <span className="dwk__count">
                        {count}/{h.weeklyTarget}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="dcard__empty">Aucune habitude définie.</p>
          )}
        </button>

        {/* Séances de la semaine */}
        <button
          className="dpanel dpanel--session"
          onClick={() => navigate('/entrainement')}
          aria-label="Entraînement"
        >
          <div className="dpanel__head">
            <h2 className="dpanel__title">Séances de la semaine</h2>
            <span className="dpanel__hint">
              {weekSessions.length} · {totalDuration ?? '—'}
            </span>
          </div>
          {weekSessions.length > 0 ? (
            <ul className="dsessions">
              {weekSessions.map((s) => (
                <li key={s.id} className="dsession">
                  <span className="dsession__day">
                    {weekdayInitial(...s.date.split('-').map(Number))}
                  </span>
                  <span className="dsession__icon">
                    {TRAINING_TYPE[s.type].icon}
                  </span>
                  <span className="dsession__body">
                    <span className="dsession__title">
                      {s.title || TRAINING_TYPE[s.type].label}
                    </span>
                  </span>
                  {s.durationMin && (
                    <span className="dsession__dur">
                      {formatDuration(s.durationMin)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="dpanel__rest">
              <span className="dpanel__resticon">🛌</span>
              <p className="dcard__empty">Aucune séance cette semaine.</p>
            </div>
          )}
        </button>
      </section>

      <section className="dfin">
        <PatrimoinePanel finances={finances} navigate={navigate} />
        <EnvelopesPanel finances={finances} navigate={navigate} />
      </section>
    </>
  );
}
