import CapitalChart from './CapitalChart';
import {
  formatEur,
  formatOdds,
  formatPct,
  formatSignedEur,
  trendClass,
} from './constants';

/** Onglet « Vue d'ensemble » : courbe de capital + chiffres essentiels. */
export default function OverviewTab({ bankroll }) {
  const s = bankroll.stats;
  const color = bankroll.color || '#818cf8';

  const highlights = [
    { label: 'Réussite', value: formatPct(s.successRate) },
    {
      label: 'TWR',
      value: formatPct(s.twr, { signed: true }),
      tone: trendClass(s.twr),
    },
    {
      label: 'TRI annualisé',
      value: formatPct(s.tri, { signed: true }),
      tone: trendClass(s.tri),
    },
    {
      label: 'Drawdown max',
      value: formatEur(s.maxDrawdown),
      tone: s.maxDrawdown ? 'down' : 'flat',
    },
    { label: 'Mise moyenne', value: formatEur(s.avgStake) },
    { label: 'Cote moyenne', value: formatOdds(s.avgOdds) },
  ];

  return (
    <div className="btab">
      <section className="bcardbox">
        <h3 className="bcardbox__title">Évolution du capital</h3>
        <CapitalChart data={s.curve} color={color} />
      </section>

      <div className="boverview">
        <section className="bcardbox">
          <h3 className="bcardbox__title">Activité</h3>
          <ul className="bcounts">
            <li className="bcount">
              <span className="bcount__n t-up">{s.wonCount}</span>
              <span className="bcount__l">Gagnants</span>
            </li>
            <li className="bcount">
              <span className="bcount__n t-down">{s.lostCount}</span>
              <span className="bcount__l">Perdants</span>
            </li>
            <li className="bcount">
              <span className="bcount__n">{s.voidCount}</span>
              <span className="bcount__l">Remboursés</span>
            </li>
            <li className="bcount">
              <span className="bcount__n">{s.pendingCount}</span>
              <span className="bcount__l">En cours</span>
            </li>
          </ul>
          <div className="boverview__lines">
            <div>
              <span>Mises jouées</span>
              <strong>{formatEur(s.turnover)}</strong>
            </div>
            <div>
              <span>Mises en cours</span>
              <strong>{formatEur(s.pendingStake)}</strong>
            </div>
            <div>
              <span>Capital de départ</span>
              <strong>{formatEur(s.startingCapital)}</strong>
            </div>
          </div>
        </section>

        <section className="bcardbox">
          <h3 className="bcardbox__title">Indicateurs clés</h3>
          <ul className="bstatlist">
            {highlights.map((h) => (
              <li key={h.label} className="bstat">
                <span className="bstat__label">{h.label}</span>
                <span className={`bstat__value${h.tone ? ` t-${h.tone}` : ''}`}>
                  {h.value}
                </span>
              </li>
            ))}
            <li className="bstat">
              <span className="bstat__label">Série victoires max</span>
              <span className="bstat__value t-up">{s.maxWinStreak}</span>
            </li>
            <li className="bstat">
              <span className="bstat__label">Plus gros bénéfice</span>
              <span className={`bstat__value t-${trendClass(s.biggestWin)}`}>
                {formatSignedEur(s.biggestWin)}
              </span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
