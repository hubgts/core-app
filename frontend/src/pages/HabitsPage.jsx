import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { habitsApi } from '../api/habits';
import { confirmDialog } from '../components/dialogs';
import HabitFormModal from '../components/HabitFormModal';
import YearHeatmap from '../components/YearHeatmap';
import {
  addMonths,
  daysInMonth,
  isoWeekday,
  isWeekend,
  monthLabel,
  todayStr,
  weekdayInitial,
  ymd,
} from '../utils/date';
import './HabitsPage.css';
import { toast } from '../components/toast';

const MILESTONES_DAYS = [7, 30, 100, 365];
const MILESTONES_WEEKS = [4, 12, 26, 52];

// Streak en jours : une habitude « x/sem » compte en semaines côté backend,
// on convertit alors en jours (× 7). Au-delà de 30 jours, on bascule en mois.
function formatStreak(streak, unit) {
  const jours = unit === 'weeks' ? streak * 7 : streak;
  if (jours > 30) return `${Math.round(jours / 30)}m`;
  return `${jours}j`;
}

// Petit anneau de progression générique (avancement fait/objectif).
function ProgressRing({ done, target, color }) {
  const r = 8;
  const circ = 2 * Math.PI * r;
  const ratio = Math.min(done / target, 1);
  const met = done >= target;
  return (
    <svg
      className="wring"
      width="22"
      height="22"
      viewBox="0 0 22 22"
      aria-hidden="true"
    >
      <circle className="wring__bg" cx="11" cy="11" r={r} />
      <circle
        className="wring__fg"
        cx="11"
        cy="11"
        r={r}
        stroke={color}
        strokeDasharray={`${circ * ratio} ${circ}`}
        transform="rotate(-90 11 11)"
      />
      {met && (
        <text className="wring__tick" x="11" y="15">
          ✓
        </text>
      )}
    </svg>
  );
}

export default function HabitsPage() {
  const today = todayStr();
  const [now] = useState(() => new Date());
  const [period, setPeriod] = useState('month'); // 'month' | 'year'
  const [cursor, setCursor] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });

  const [habits, setHabits] = useState([]);
  const [checks, setChecks] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState({ open: false, habit: null });
  const dragIndex = useRef(null);

  const nbDays = daysInMonth(cursor.year, cursor.month);
  const days = useMemo(
    () => Array.from({ length: nbDays }, (_, i) => i + 1),
    [nbDays],
  );

  // Plage de dates à charger : le mois affiché, ou l'année entière.
  const range = useMemo(() => {
    if (period === 'year') {
      return { from: ymd(cursor.year, 1, 1), to: ymd(cursor.year, 12, 31) };
    }
    return {
      from: ymd(cursor.year, cursor.month, 1),
      to: ymd(
        cursor.year,
        cursor.month,
        daysInMonth(cursor.year, cursor.month),
      ),
    };
  }, [period, cursor.year, cursor.month]);

  const load = useCallback(async () => {
    setError('');
    try {
      const [list, rangeChecks] = await Promise.all([
        habitsApi.list(today),
        habitsApi.checksInRange(range.from, range.to),
      ]);
      setHabits(list);
      setChecks(new Set(rangeChecks.map((c) => `${c.habitId}|${c.date}`)));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, today]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // --- Toggle d'une cellule (optimiste) -------------------------------------
  // Volontairement permissif : on peut cocher n'importe quel jour, passé comme
  // futur (la date de création reste un simple repère visuel, voir grille).
  async function toggle(habit, dateStr) {
    const key = `${habit.id}|${dateStr}`;
    const willCheck = !checks.has(key);
    const prevStreak = habit.stats.currentStreak;

    setChecks((prev) => {
      const next = new Set(prev);
      willCheck ? next.add(key) : next.delete(key);
      return next;
    });

    try {
      const res = await habitsApi.setCheck(habit.id, dateStr, willCheck, today);
      setHabits((prev) =>
        prev.map((h) => (h.id === habit.id ? { ...h, stats: res.stats } : h)),
      );
      const reached = res.stats.currentStreak;
      const milestones =
        res.stats.streakUnit === 'weeks' ? MILESTONES_WEEKS : MILESTONES_DAYS;
      if (willCheck && reached > prevStreak && milestones.includes(reached)) {
        const unit = res.stats.streakUnit === 'weeks' ? 'semaines' : 'jours';
        toast(`🔥 ${reached} ${unit} d’affilée sur « ${habit.name} » !`);
      }
    } catch (e) {
      setChecks((prev) => {
        const next = new Set(prev);
        willCheck ? next.delete(key) : next.add(key);
        return next;
      });
      toast(`Erreur : ${e.message}`);
    }
  }

  // --- CRUD ------------------------------------------------------------------
  async function handleSave(data) {
    if (modal.habit) {
      await habitsApi.update(modal.habit.id, data);
    } else {
      await habitsApi.create(data);
    }
    setModal({ open: false, habit: null });
    await load();
  }

  async function handleArchive(habit) {
    await habitsApi.archive(habit.id);
    setModal({ open: false, habit: null });
    await load();
  }

  async function handleDelete(habit) {
    const ok = await confirmDialog({
      message: `Supprimer « ${habit.name} » et tout son historique ?\nCette action est irréversible.`,
      danger: true,
    });
    if (!ok) return;
    await habitsApi.remove(habit.id);
    setModal({ open: false, habit: null });
    await load();
  }

  // --- Drag & drop (réordonnancement) ---------------------------------------
  function onDrop(dropIndex) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === dropIndex) return;
    const next = [...habits];
    const [moved] = next.splice(from, 1);
    next.splice(dropIndex, 0, moved);
    setHabits(next);
    habitsApi
      .reorder(next.map((h) => h.id))
      .catch((e) => toast(`Erreur : ${e.message}`));
  }

  // --- KPIs (complétion du mois, RG-10/12) ----------------------------------
  const kpis = useMemo(() => {
    let expected = 0;
    let done = 0;
    let bestCurrent = 0;
    for (const h of habits) {
      bestCurrent = Math.max(bestCurrent, h.stats.currentStreak);
      const created = h.createdAt.slice(0, 10);
      let eligibleDays = 0;
      let hDone = 0;
      for (const d of days) {
        const dateStr = ymd(cursor.year, cursor.month, d);
        if (dateStr < created) continue;
        eligibleDays += 1;
        if (checks.has(`${h.id}|${dateStr}`)) hDone += 1;
      }
      const hExpected = (h.weeklyTarget * eligibleDays) / 7;
      expected += hExpected;
      done += Math.min(hDone, hExpected);
    }
    return {
      completion: expected ? Math.round((done / expected) * 100) : 0,
      bestCurrent,
    };
  }, [habits, checks, days, cursor.year, cursor.month]);

  const goPeriod = (delta) => {
    if (period === 'year') {
      setCursor((c) => ({ ...c, year: c.year + delta }));
    } else {
      setCursor((c) => addMonths(c.year, c.month, delta));
    }
  };
  const goToday = () =>
    setCursor({ year: now.getFullYear(), month: now.getMonth() + 1 });

  const periodLabel =
    period === 'year'
      ? String(cursor.year)
      : monthLabel(cursor.year, cursor.month);

  const openMonth = (month) => {
    setCursor((c) => ({ ...c, month }));
    setPeriod('month');
  };

  const showGridMonth = period === 'month';
  const showGridYear = period === 'year';

  return (
    <div className="habits-page">
      <header className="page-head">
        <div>
          <h1 className="page-head__title">Habitudes</h1>
          <p className="page-head__subtitle">
            Coche chaque jour tenu. La régularité prime sur la performance.
          </p>
        </div>
        <button
          className="btn btn--primary"
          onClick={() => setModal({ open: true, habit: null })}
        >
          + Habitude
        </button>
      </header>

      <div className="control-bar">
        <div className="control-bar__nav">
          <button
            className="icon-btn"
            onClick={() => goPeriod(-1)}
            aria-label="Précédent"
          >
            ‹
          </button>
          <span className="control-bar__label">{periodLabel}</span>
          <button
            className="icon-btn"
            onClick={() => goPeriod(1)}
            aria-label="Suivant"
          >
            ›
          </button>
          <button className="btn btn--ghost btn--sm" onClick={goToday}>
            Aujourd’hui
          </button>
        </div>

        <div className="control-bar__switches">
          <div className="segmented" role="radiogroup" aria-label="Période">
            <button
              role="radio"
              aria-checked={period === 'month'}
              className={`segmented__btn${period === 'month' ? ' is-active' : ''}`}
              onClick={() => setPeriod('month')}
            >
              Mois
            </button>
            <button
              role="radio"
              aria-checked={period === 'year'}
              className={`segmented__btn${period === 'year' ? ' is-active' : ''}`}
              onClick={() => setPeriod('year')}
            >
              Année
            </button>
          </div>
        </div>
      </div>

      {error && <p className="banner banner--error">{error}</p>}

      {loading ? (
        <p className="muted">Chargement…</p>
      ) : habits.length === 0 ? (
        <div className="empty">
          <div className="empty__emoji">🌱</div>
          <p className="empty__text">
            Crée ta première habitude pour commencer à suivre ta régularité.
          </p>
          <button
            className="btn btn--primary"
            onClick={() => setModal({ open: true, habit: null })}
          >
            + Habitude
          </button>
        </div>
      ) : showGridYear ? (
        <YearHeatmap
          habits={habits}
          checks={checks}
          year={cursor.year}
          today={today}
          onPickMonth={openMonth}
        />
      ) : (
        <div className="grid-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th className="grid__corner">Habitude</th>
                {days.map((d) => {
                  const dateStr = ymd(cursor.year, cursor.month, d);
                  const cls = [
                    'grid__dayhead',
                    isWeekend(cursor.year, cursor.month, d) ? 'is-weekend' : '',
                    dateStr === today ? 'is-today' : '',
                    isoWeekday(dateStr) === 0 ? 'is-weekstart' : '',
                  ].join(' ');
                  return (
                    <th key={d} className={cls}>
                      <span className="grid__daynum">{d}</span>
                      <span className="grid__dayinit">
                        {weekdayInitial(cursor.year, cursor.month, d)}
                      </span>
                    </th>
                  );
                })}
                <th className="grid__railhead">Sem.</th>
                <th className="grid__railhead">🔥</th>
              </tr>
            </thead>
            <tbody>
              {habits.map((h, idx) => {
                const created = h.createdAt.slice(0, 10);
                const createdFr = created.split('-').reverse().join('/');
                return (
                  <tr
                    key={h.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(idx)}
                  >
                    <td
                      className="grid__name"
                      style={{ '--accent': h.color }}
                      draggable
                      onDragStart={() => (dragIndex.current = idx)}
                      onClick={() => setModal({ open: true, habit: h })}
                      title="Cliquer pour modifier · glisser pour réordonner"
                    >
                      <span className="grid__drag">⠿</span>
                      <span className="grid__icon">{h.icon}</span>
                      <span className="grid__namecol">
                        <span className="grid__hname">{h.name}</span>
                        {h.weeklyTarget < 7 && (
                          <span className="grid__target">
                            {h.weeklyTarget}×/sem
                          </span>
                        )}
                      </span>
                    </td>

                    {days.map((d) => {
                      const dateStr = ymd(cursor.year, cursor.month, d);
                      const key = `${h.id}|${dateStr}`;
                      const checked = checks.has(key);
                      const isFuture = dateStr > today;
                      const isPre = dateStr < created; // avant la création de l'habitude
                      const cls = [
                        'grid__cell',
                        isWeekend(cursor.year, cursor.month, d)
                          ? 'is-weekend'
                          : '',
                        dateStr === today ? 'is-today' : '',
                        isoWeekday(dateStr) === 0 ? 'is-weekstart' : '',
                      ].join(' ');
                      const cellCls = [
                        'cell',
                        checked ? 'cell--checked' : '',
                        isPre ? 'cell--precreate' : '',
                        isFuture ? 'cell--future' : '',
                      ]
                        .filter(Boolean)
                        .join(' ');
                      const label = isPre
                        ? `${h.name}, ${dateStr} (avant création le ${createdFr}), ${checked ? 'coché' : 'non coché'}`
                        : `${h.name}, ${dateStr}, ${checked ? 'coché' : 'non coché'}`;
                      return (
                        <td key={d} className={cls}>
                          <button
                            className={cellCls}
                            style={
                              checked
                                ? { background: h.color, borderColor: h.color }
                                : undefined
                            }
                            onClick={() => toggle(h, dateStr)}
                            title={
                              isPre
                                ? `« ${h.name} » créée le ${createdFr} — suivi à partir de cette date`
                                : undefined
                            }
                            aria-label={label}
                          >
                            {checked ? '✓' : ''}
                          </button>
                        </td>
                      );
                    })}

                    <td className="grid__rail">
                      <span
                        className="prog-badge"
                        title={`Cette semaine : ${h.stats.weekDone}/${h.weeklyTarget}`}
                      >
                        <ProgressRing
                          done={h.stats.weekDone}
                          target={h.weeklyTarget}
                          color={h.color}
                        />
                        <span className="prog-badge__txt">
                          {h.stats.weekDone}/{h.weeklyTarget}
                        </span>
                      </span>
                    </td>
                    <td className="grid__rail">
                      <span className="streak-badge" title="Série en cours">
                        🔥{' '}
                        {formatStreak(
                          h.stats.currentStreak,
                          h.stats.streakUnit,
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && habits.length > 0 && showGridMonth && (
        <footer className="kpis">
          <div className="kpi">
            <span className="kpi__value">{kpis.completion}%</span>
            <span className="kpi__label">Complétion du mois</span>
          </div>
          <div className="kpi">
            <span className="kpi__value">{kpis.bestCurrent} 🔥</span>
            <span className="kpi__label">Meilleure série en cours</span>
          </div>
        </footer>
      )}

      {modal.open && (
        <HabitFormModal
          habit={modal.habit}
          onSave={handleSave}
          onArchive={handleArchive}
          onDelete={handleDelete}
          onClose={() => setModal({ open: false, habit: null })}
        />
      )}
    </div>
  );
}
