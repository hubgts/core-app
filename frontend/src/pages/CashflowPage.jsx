import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { budgetApi } from '../api/budget';
import Donut from '../components/finances/Donut';
import CashflowChart from '../components/budget/CashflowChart';
import MonthNav from '../components/budget/MonthNav';
import {
  formatEur,
  formatSignedEur,
  trendClass,
  monthLabel,
  currentMonth,
  clampPct,
} from '../components/budget/constants';
import './FinancesPage.css';
import './BudgetPage.css';
import './CashflowPage.css';

export default function CashflowPage() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (m) => {
    setError('');
    try {
      setData(await budgetApi.cashflow(m));
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

  if (loading && !data) {
    return (
      <div className="fpage">
        <div className="fpage__loading">Chargement…</div>
      </div>
    );
  }

  return (
    <div className="fpage">
      <header className="fpage__head">
        <h1 className="fpage__title">📊 Vue d'ensemble</h1>
        <div className="fpage__headactions">
          <MonthNav month={month} onChange={setMonth} />
          <Link className="btn btn--primary" to="/budget/plan">Plan &amp; dépenses</Link>
        </div>
      </header>

      {error && <p className="fpage__error">{error}</p>}

      {data && !data.hasData && (
        <section className="fcard bonboard">
          <h2 className="fcard__title">Aucun flux ce mois-ci</h2>
          <p className="bonboard__text">
            Saisissez vos revenus et vos dépenses depuis l'onglet <strong>Plan &amp; dépenses</strong>.
            Cette vue résume alors vos entrées, vos sorties, votre taux d'épargne et le report
            de trésorerie d'un mois sur l'autre.
          </p>
          <div className="bonboard__actions">
            <Link className="btn btn--primary" to="/budget/plan">Aller au plan</Link>
          </div>
        </section>
      )}

      {data && data.hasData && (
        <>
          {/* Bandeau cash-flow : entrées / sorties / solde du mois */}
          <section className="bbanner">
            <div className="bbanner__cell">
              <span className="fhero__label">Entrées</span>
              <span className="bbanner__value t-up">{formatEur(data.income)}</span>
            </div>
            <div className="bbanner__cell">
              <span className="fhero__label">Sorties</span>
              <span className="bbanner__value t-down">{formatEur(data.expenses)}</span>
            </div>
            <div className="bbanner__cell">
              <span className="fhero__label">Solde du mois</span>
              <span className={`bbanner__value t-${trendClass(data.net)}`}>
                {formatSignedEur(data.net)}
              </span>
            </div>
          </section>

          {/* Taux d'épargne + report */}
          <section className="fgrid bcf__stats">
            <div className="fcard bcfstat">
              <span className="fhero__label">Taux d'épargne</span>
              <span className="bcfstat__big">
                {data.savingsRate != null ? `${Math.round(data.savingsRate)} %` : '—'}
              </span>
              <span className="bcfstat__sub">
                {formatEur(data.savings)} épargnés sur {formatEur(data.income)} de revenus
              </span>
              {data.savingsRate != null && (
                <div className="bcfstat__bar">
                  <div
                    className="bcfstat__barfill"
                    style={{ width: `${clampPct(data.savingsRate)}%`, background: '#34d399' }}
                  />
                </div>
              )}
            </div>

            <div className="fcard bcfstat">
              <span className="fhero__label">Report de trésorerie</span>
              <span className={`bcfstat__big t-${trendClass(data.endBalance)}`}>
                {formatSignedEur(data.endBalance)}
              </span>
              <ul className="bcarry">
                <li>
                  <span>Report mois précédent ({monthLabel(data.previousMonth.month)})</span>
                  <strong className={`t-${trendClass(data.carryIn)}`}>{formatSignedEur(data.carryIn)}</strong>
                </li>
                <li>
                  <span>+ Solde du mois</span>
                  <strong className={`t-${trendClass(data.net)}`}>{formatSignedEur(data.net)}</strong>
                </li>
                <li className="bcarry__total">
                  <span>= Solde de fin de mois</span>
                  <strong className={`t-${trendClass(data.endBalance)}`}>{formatSignedEur(data.endBalance)}</strong>
                </li>
              </ul>
            </div>
          </section>

          {/* Tendance entrées vs sorties + répartition des sorties */}
          <section className="fgrid bcf__charts">
            <div className="fcard">
              <h2 className="fcard__title">Entrées vs sorties</h2>
              <CashflowChart data={data.history} current={data.month} />
            </div>
            <div className="fcard fcard--donut">
              <h2 className="fcard__title">Répartition des sorties</h2>
              <Donut slices={data.pie} gross={data.expenses} label="Répartition des sorties" centerSub="dépensé" />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
