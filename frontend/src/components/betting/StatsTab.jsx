import {
  formatEur,
  formatOdds,
  formatPct,
  formatSignedEur,
  trendClass,
} from './constants';

/** Onglet « Statistiques » : toutes les grandeurs, groupées par thème. */
export default function StatsTab({ stats: s }) {
  const groups = [
    {
      title: 'Performance',
      rows: [
        {
          label: 'Bénéfice',
          value: formatSignedEur(s.profit),
          tone: trendClass(s.profit),
        },
        { label: 'ROI', value: formatPct(s.roi) },
        {
          label: 'Progression (ROC)',
          value: formatPct(s.progression, { signed: true }),
          tone: trendClass(s.progression),
        },
        {
          label: 'TWR',
          value: formatPct(s.twr, { signed: true }),
          tone: trendClass(s.twr),
        },
        {
          label: 'TRI (annualisé)',
          value: formatPct(s.tri, { signed: true }),
          tone: trendClass(s.tri),
        },
        { label: 'Réussite', value: formatPct(s.successRate) },
        { label: 'Capital de départ', value: formatEur(s.startingCapital) },
        { label: 'Capital actuel', value: formatEur(s.currentCapital) },
      ],
    },
    {
      title: 'Activité',
      rows: [
        { label: 'Paris', value: s.betCount },
        { label: 'Paris gagnants', value: s.wonCount, tone: 'up' },
        { label: 'Paris perdants', value: s.lostCount, tone: 'down' },
        { label: 'Paris remboursés', value: s.voidCount },
        { label: 'Paris en cours', value: s.pendingCount },
        { label: 'Mises jouées', value: formatEur(s.turnover) },
        { label: 'Mises en cours', value: formatEur(s.pendingStake) },
      ],
    },
    {
      title: 'Risque & distribution',
      rows: [
        {
          label: 'Drawdown max',
          value: formatEur(s.maxDrawdown),
          tone: s.maxDrawdown ? 'down' : 'flat',
        },
        { label: 'Série victoires max', value: s.maxWinStreak, tone: 'up' },
        {
          label: 'Série défaites max',
          value: s.maxLossStreak,
          tone: s.maxLossStreak ? 'down' : 'flat',
        },
        { label: 'Mise moyenne', value: formatEur(s.avgStake) },
        { label: 'Mise max', value: formatEur(s.maxStake) },
        { label: 'Cote moyenne', value: formatOdds(s.avgOdds) },
        { label: 'Plus grosse cote gagnée', value: formatOdds(s.bestWonOdds) },
        {
          label: 'Plus gros bénéfice',
          value: formatSignedEur(s.biggestWin),
          tone: trendClass(s.biggestWin),
        },
        {
          label: 'Plus grosse perte',
          value: formatSignedEur(s.biggestLoss),
          tone: trendClass(s.biggestLoss),
        },
        { label: 'Commissions', value: formatEur(s.commissions) },
        {
          label: 'CLV',
          value: s.clv == null ? '—' : formatPct(s.clv, { signed: true }),
          tone: trendClass(s.clv),
        },
      ],
    },
  ];

  return (
    <div className="btab bstatgrid">
      {groups.map((g) => (
        <section key={g.title} className="bstatcard">
          <h3 className="bstatcard__title">{g.title}</h3>
          <ul className="bstatlist">
            {g.rows.map((r) => (
              <li key={r.label} className="bstat">
                <span className="bstat__label">{r.label}</span>
                <span className={`bstat__value${r.tone ? ` t-${r.tone}` : ''}`}>
                  {r.value}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
