import { useCallback, useEffect, useMemo, useState } from 'react';
import { alimentationApi } from '../api/alimentation';
import { confirmDialog } from '../components/dialogs';
import { toast } from '../components/toast';
import MealLogEntryModal from '../components/alimentation/MealLogEntryModal';
import {
  addDaysStr,
  frenchDayMonth,
  todayStr,
  weekDatesOf,
} from '../utils/date';
import './JournalPage.css';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const emptyTotals = () => ({ carbs: 0, protein: 0, fat: 0, kcal: 0 });
const fmt = (n) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

/**
 * Journal alimentaire : vue semaine (lun→dim). Chaque jour liste ce qui a été
 * mangé (recettes / aliments, avec heure) et affiche le total macros + kcal.
 * Les entrées portent un snapshot figé de leurs macros (côté backend).
 */
export default function JournalPage() {
  const [cursor, setCursor] = useState(todayStr());
  const [entries, setEntries] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // { date, entry? } | null

  const week = useMemo(() => weekDatesOf(cursor), [cursor]);
  const from = week[0];
  const to = week[6];

  const loadEntries = useCallback(async () => {
    setError('');
    try {
      setEntries(await alimentationApi.mealLog(from, to));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    setLoading(true);
    loadEntries();
  }, [loadEntries]);

  // Recettes + aliments (pour la modale) chargés une fois.
  useEffect(() => {
    alimentationApi
      .list()
      .then(setRecipes)
      .catch(() => setRecipes([]));
    alimentationApi
      .foods()
      .then(setFoods)
      .catch(() => setFoods([]));
  }, []);

  // Regroupe les entrées par jour + total journalier.
  const byDay = useMemo(() => {
    const map = new Map(
      week.map((d) => [d, { items: [], totals: emptyTotals() }]),
    );
    for (const e of entries) {
      const day = map.get(e.date);
      if (!day) continue;
      day.items.push(e);
      day.totals.carbs += e.carbs;
      day.totals.protein += e.protein;
      day.totals.fat += e.fat;
      day.totals.kcal += e.kcal;
    }
    return map;
  }, [entries, week]);

  async function save(payload) {
    if (modal?.entry) {
      await alimentationApi.updateMealLogEntry(modal.entry.id, payload);
    } else {
      await alimentationApi.createMealLogEntry(payload);
    }
    setModal(null);
    toast('Enregistré.');
    await loadEntries();
  }

  async function remove(entry) {
    if (
      !(await confirmDialog({
        message: `Retirer « ${entry.label} » du journal ?`,
        danger: true,
      }))
    )
      return;
    await alimentationApi.removeMealLogEntry(entry.id);
    setModal(null);
    toast('Entrée supprimée.');
    await loadEntries();
  }

  const weekLabel = `${frenchDayMonth(from)} – ${frenchDayMonth(to)}`;

  return (
    <div className="journalpage">
      <header className="alpage__head">
        <div>
          <h1 className="alpage__title">📔 Journal</h1>
          <p className="page-head__subtitle">
            Ce que tu manges au quotidien, avec le total nutritionnel par jour.
          </p>
        </div>
      </header>

      <div className="jnav">
        <button
          className="btn btn--ghost"
          onClick={() => setCursor(addDaysStr(cursor, -7))}
          aria-label="Semaine précédente"
        >
          ‹
        </button>
        <span className="jnav__label">{weekLabel}</span>
        <button
          className="btn btn--ghost"
          onClick={() => setCursor(addDaysStr(cursor, 7))}
          aria-label="Semaine suivante"
        >
          ›
        </button>
        <button
          className="btn btn--ghost jnav__today"
          onClick={() => setCursor(todayStr())}
        >
          Aujourd'hui
        </button>
      </div>

      {error && <p className="modal__error">{error}</p>}

      {loading ? (
        <p className="ref-empty">Chargement…</p>
      ) : (
        <div className="jweek">
          {week.map((day, i) => {
            const { items, totals } = byDay.get(day);
            const isToday = day === todayStr();
            return (
              <section
                key={day}
                className={`jday${isToday ? ' jday--today' : ''}`}
              >
                <header className="jday__head">
                  <span className="jday__dow">{WEEKDAYS[i]}</span>
                  <span className="jday__date">{frenchDayMonth(day)}</span>
                </header>

                <ul className="jday__list">
                  {items.map((e) => (
                    <li key={e.id}>
                      <button
                        className="jentry"
                        onClick={() => setModal({ date: day, entry: e })}
                      >
                        <span className="jentry__time">{e.time ?? '—'}</span>
                        <span className="jentry__label">
                          {e.label}
                          <span className="jentry__amount">
                            {e.kind === 'recipe'
                              ? `${fmt(e.servings ?? 1)} portion${(e.servings ?? 1) > 1 ? 's' : ''}`
                              : `${fmt(e.quantity ?? 0)} ${e.unit ?? ''}`}
                          </span>
                        </span>
                        <span className="jentry__kcal">
                          {Math.round(e.kcal)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>

                {items.length > 0 && (
                  <div className="jday__total">
                    <span className="jday__kcal">
                      {Math.round(totals.kcal)} kcal
                    </span>
                    <span className="jday__macros">
                      G {fmt(totals.carbs)} · P {fmt(totals.protein)} · L{' '}
                      {fmt(totals.fat)}
                    </span>
                  </div>
                )}

                <button
                  className="jday__add"
                  onClick={() => setModal({ date: day })}
                >
                  + Ajouter
                </button>
              </section>
            );
          })}
        </div>
      )}

      {modal && (
        <MealLogEntryModal
          entry={modal.entry}
          date={modal.date}
          recipes={recipes}
          foods={foods}
          onSave={save}
          onDelete={remove}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
