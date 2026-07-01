import { useCallback, useEffect, useRef, useState } from 'react';
import { budgetApi } from '../api/budget';
import { confirmDialog } from '../components/dialogs';
import Donut from '../components/finances/Donut';
import KebabMenu from '../components/KebabMenu';
import MonthNav from '../components/budget/MonthNav';
import TransactionModal from '../components/budget/TransactionModal';
import CategoriesModal from '../components/budget/CategoriesModal';
import {
  formatEur,
  formatSignedEur,
  trendClass,
  monthLabel,
  currentMonth,
  statusMeta,
  clampPct,
  DEFAULT_PLAN,
} from '../components/budget/constants';
import './FinancesPage.css';
import './BudgetPage.css';
import { toast } from '../components/toast';

export default function BudgetPage() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [txModal, setTxModal] = useState(null); // { kind?, categoryId?, transaction? } | null
  const [showCategories, setShowCategories] = useState(false);
  const toastTimer = useRef(null);

  const load = useCallback(async (m) => {
    setError('');
    try {
      setData(await budgetApi.overview(m));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load(month);
  }, [load, month]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  async function saveTransaction(payload) {
    if (txModal?.transaction) {
      await budgetApi.updateTransaction(txModal.transaction.id, payload);
      toast('Transaction mise à jour.');
    } else {
      await budgetApi.createTransaction(payload);
      toast(payload.kind === 'entree' ? 'Revenu ajouté.' : 'Dépense ajoutée.');
    }
    setTxModal(null);
    await load(month);
  }

  async function deleteTransaction(id) {
    if (
      !(await confirmDialog({
        message: 'Supprimer cette transaction ?',
        danger: true,
      }))
    )
      return;
    await budgetApi.removeTransaction(id);
    toast('Transaction supprimée.');
    await load(month);
  }

  async function seedDefaultPlan() {
    try {
      const created = [];
      for (const c of DEFAULT_PLAN)
        created.push(await budgetApi.createCategory(c));
      await budgetApi.setPlan(
        month,
        created.map((cat, i) => ({
          categoryId: cat.id,
          targetPct: DEFAULT_PLAN[i].targetPct,
        })),
      );
      await load(month);
    } catch (e) {
      setError(e.message);
    }
  }

  async function addReferenceIncome() {
    try {
      await budgetApi.createTransaction({
        kind: 'entree',
        amount: data.plannedIncome,
        date: `${month}-01`,
        label: 'Revenu de référence',
      });
      await load(month);
    } catch (e) {
      toast(e.message);
    }
  }

  if (loading && !data) {
    return (
      <div className="fpage">
        <div className="fpage__loading">Chargement…</div>
      </div>
    );
  }

  const categories = data?.categories ?? [];
  const allCats = data?.allCategories ?? [];
  const planCats = categories.filter((c) => c.inPlan);

  return (
    <div className="fpage">
      <header className="fpage__head">
        <h1 className="fpage__title">🎯 Plan &amp; dépenses</h1>
        <div className="fpage__headactions">
          <MonthNav month={month} onChange={setMonth} />
          {data?.hasCategories && (
            <>
              <button
                className="btn btn--primary"
                onClick={() => setTxModal({ kind: 'sortie' })}
              >
                + Dépense
              </button>
              <KebabMenu
                actions={[
                  {
                    icon: '🛠️',
                    label: 'Gérer le plan',
                    onClick: () => setShowCategories(true),
                  },
                ]}
              />
            </>
          )}
        </div>
      </header>

      {error && <p className="fpage__error">{error}</p>}

      {/* Onboarding : aucun plan défini */}
      {data && !data.hasCategories && (
        <section className="fcard bonboard">
          <h2 className="fcard__title">Définissez votre plan budgétaire</h2>
          <p className="bonboard__text">
            Répartissez votre revenu en catégories (ex. le classique{' '}
            <strong>50 / 30 / 20</strong> : besoins de première nécessité,
            plaisirs, épargne). Vous saisirez ensuite vos dépenses et verrez en
            temps réel si vous respectez votre plan.
          </p>
          <div className="bonboard__actions">
            <button className="btn btn--primary" onClick={seedDefaultPlan}>
              Utiliser le modèle 50/30/20
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => setShowCategories(true)}
            >
              Créer un plan personnalisé
            </button>
          </div>
        </section>
      )}

      {data && data.hasCategories && (
        <>
          {/* Bandeau revenu + reste à allouer */}
          <section className="bbanner">
            <div className="bbanner__cell">
              <span className="fhero__label">Revenu du mois</span>
              <span className="bbanner__value">{formatEur(data.income)}</span>
              <button
                className="fsumlink fsumlink--btn"
                onClick={() => setTxModal({ kind: 'entree' })}
              >
                + Revenu
              </button>
            </div>
            <div className="bbanner__cell">
              <span className="fhero__label">Dépensé / alloué</span>
              <span className="bbanner__value">
                {formatEur(data.totalSpent)}
              </span>
            </div>
            <div className="bbanner__cell">
              <span className="fhero__label">Reste à allouer</span>
              <span
                className={`bbanner__value t-${trendClass(data.remaining)}`}
              >
                {formatEur(data.remaining)}
              </span>
            </div>
          </section>

          {data.income === 0 && data.plannedIncome != null && (
            <button className="freminder" onClick={addReferenceIncome}>
              💡 Ajouter votre revenu de référence (
              {formatEur(data.plannedIncome)}) comme revenu du mois →
            </button>
          )}
          {Math.round(data.planTotalPct) !== 100 && (
            <p className="bwarn">
              ⚠ La somme des cibles fait {Math.round(data.planTotalPct)} %
              (idéalement 100 %).{' '}
              <button
                className="fsumlink fsumlink--btn"
                onClick={() => setShowCategories(true)}
              >
                Ajuster le plan
              </button>
            </p>
          )}

          {/* Synthèse : camembert du réel + plan vs réel */}
          <section className="fgrid">
            <div className="fcard fcard--donut">
              <h2 className="fcard__title">Répartition du mois</h2>
              <Donut
                slices={data.pie}
                gross={data.totalSpent}
                label="Répartition des dépenses"
                centerSub="dépensé"
              />
            </div>

            <div className="fcard">
              <div className="fcard__head">
                <h2 className="fcard__title">Plan vs réel</h2>
                <button
                  className="fsumlink fsumlink--btn"
                  onClick={() => setShowCategories(true)}
                >
                  Gérer le plan
                </button>
              </div>
              {data.planInherited && data.planSource && (
                <p className="bwarn">
                  ↩ Plan repris de {monthLabel(data.planSource)}.
                </p>
              )}
              {planCats.length === 0 ? (
                <p className="fempty">
                  Aucune catégorie dans le plan de ce mois.{' '}
                  <button
                    className="fsumlink fsumlink--btn"
                    onClick={() => setShowCategories(true)}
                  >
                    Définir le plan
                  </button>
                </p>
              ) : (
                <ul className="bvs">
                  {planCats.map((c) => {
                    const real = c.realPctOfIncome;
                    const fill = clampPct(real);
                    const marker = clampPct(c.targetPct);
                    return (
                      <li key={c.id} className="bvs__row">
                        <span className="bvs__name">
                          {c.icon ? `${c.icon} ` : ''}
                          {c.name}
                        </span>
                        <span className="bvs__track">
                          <span
                            className="bvs__fill"
                            style={{ width: `${fill}%`, background: c.color }}
                          />
                          <span
                            className="bvs__marker"
                            style={{ left: `${marker}%` }}
                            title={`Cible ${c.targetPct} %`}
                          />
                        </span>
                        <span className="bvs__nums">
                          <strong>
                            {real != null ? `${Math.round(real)} %` : '—'}
                          </strong>
                          <span className="bvs__target">
                            {' '}
                            / {Math.round(c.targetPct ?? 0)} %
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Détail par catégorie (cible € vs réel €) */}
          <section className="fcard">
            <h2 className="fcard__title">Par catégorie</h2>
            <div className="bcatcards">
              {categories.map((c) => {
                const meta = statusMeta(c.state);
                const pct =
                  c.targetEur && c.targetEur > 0
                    ? Math.min((c.real / c.targetEur) * 100, 100)
                    : c.real > 0
                      ? 100
                      : 0;
                const over = c.state === 'over';
                return (
                  <div className="bcat" key={c.id} style={{ '--c': c.color }}>
                    <div className="bcat__top">
                      <span className="bcat__caticon">{c.icon || '•'}</span>
                      <span className="bcat__catname">{c.name}</span>
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() =>
                          setTxModal({ kind: 'sortie', categoryId: c.id })
                        }
                      >
                        + Dépense
                      </button>
                    </div>
                    <div className="bcat__amounts">
                      <strong>{formatEur(c.real)}</strong>
                      <span className="bcat__target">
                        {c.targetEur != null
                          ? ` / ${formatEur(c.targetEur)}`
                          : c.targetPct != null
                            ? ` · cible ${Math.round(c.targetPct)} %`
                            : ' · hors plan'}
                      </span>
                    </div>
                    <div className="fprog fprog--mini">
                      <div className="fprog__track">
                        <div
                          className="fprog__fill"
                          style={{
                            width: `${pct}%`,
                            background: over ? '#f87171' : c.color,
                          }}
                        />
                      </div>
                    </div>
                    {meta && (
                      <div className={`bcat__state t-${meta.tone}`}>
                        {meta.label}
                        {c.ecartEur != null &&
                          c.ecartEur !== 0 &&
                          ` · ${formatSignedEur(c.ecartEur)}`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Transactions du mois */}
          <section className="fcard">
            <div className="fcard__head">
              <h2 className="fcard__title">Transactions</h2>
              <button
                className="fsumlink fsumlink--btn"
                onClick={() => setTxModal({ kind: 'sortie' })}
              >
                + Ajouter
              </button>
            </div>
            {data.transactions.length === 0 ? (
              <p className="fempty">
                Aucune transaction ce mois-ci. Ajoutez une dépense ou un revenu.
              </p>
            ) : (
              <ul className="btx">
                {data.transactions.map((t) => (
                  <li key={t.id} className="btx__row">
                    <span className="btx__date">
                      {t.date.slice(8)}/{t.date.slice(5, 7)}
                    </span>
                    <span
                      className="btx__tag"
                      style={{ '--c': t.categoryColor || '#94a3b8' }}
                    >
                      {t.kind === 'entree' ? 'Revenu' : t.categoryName || '—'}
                    </span>
                    <span className="btx__label">{t.label || ''}</span>
                    <button
                      className="btx__edit"
                      onClick={() => setTxModal({ transaction: t })}
                      title="Modifier"
                    >
                      ✎
                    </button>
                    <span
                      className={`btx__amount${t.kind === 'sortie' ? ' btx__amount--out' : ' btx__amount--in'}`}
                    >
                      {t.kind === 'sortie' ? '−' : '+'}
                      {formatEur(t.amount)}
                    </span>
                    <button
                      className="fhist__del"
                      onClick={() => deleteTransaction(t.id)}
                      title="Supprimer"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {txModal && (
        <TransactionModal
          categories={allCats}
          defaultKind={txModal.kind}
          defaultCategoryId={txModal.categoryId}
          defaultDate={month === currentMonth() ? undefined : `${month}-01`}
          transaction={txModal.transaction}
          onSave={saveTransaction}
          onClose={() => setTxModal(null)}
        />
      )}

      {showCategories && (
        <CategoriesModal
          month={month}
          onClose={() => setShowCategories(false)}
          onChanged={() => load(month)}
        />
      )}
    </div>
  );
}
