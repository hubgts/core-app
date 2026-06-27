import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { bettingApi } from '../api/betting';
import { confirmDialog } from '../components/dialogs';
import BankrollFormModal from '../components/betting/BankrollFormModal';
import BetFormModal from '../components/betting/BetFormModal';
import OverviewTab from '../components/betting/OverviewTab';
import BetsTab from '../components/betting/BetsTab';
import StatsTab from '../components/betting/StatsTab';
import { formatEur, formatPct, formatSignedEur, trendClass } from '../components/betting/constants';
import './BettingPage.css';

const TABS = [
  { id: 'overview', label: "Vue d'ensemble" },
  { id: 'bets', label: 'Paris' },
  { id: 'stats', label: 'Statistiques' },
];

export default function BankrollDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [bankroll, setBankroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [tab, setTab] = useState('overview');
  const [betFilter, setBetFilter] = useState('all');

  const [editModal, setEditModal] = useState(false);
  const [betModal, setBetModal] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setBankroll(await bettingApi.bankroll(id));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  }

  async function saveBankroll(payload) {
    setBankroll(await bettingApi.updateBankroll(id, payload));
    setEditModal(false);
    flash('Bankroll mise à jour.');
  }
  async function archiveBankroll() {
    await bettingApi.archiveBankroll(id);
    navigate('/paris');
  }
  async function deleteBankroll() {
    if (!(await confirmDialog({ message: `Supprimer « ${bankroll.name} » et tous ses paris ? Action irréversible.`, danger: true }))) return;
    await bettingApi.removeBankroll(id);
    navigate('/paris');
  }

  async function createBet(payload) {
    setBankroll(await bettingApi.createBet(id, payload));
    setBetModal(false);
    flash('Pari ajouté.');
  }
  async function settleBet(betId, payload) {
    setBankroll(await bettingApi.settleBet(betId, payload));
  }
  async function settleSelection(selectionId, status) {
    setBankroll(await bettingApi.settleSelection(selectionId, status));
  }
  async function deleteBet(bet) {
    if (!(await confirmDialog({ message: 'Supprimer ce pari ?', danger: true }))) return;
    setBankroll(await bettingApi.removeBet(bet.id));
    flash('Pari supprimé.');
  }

  if (loading) {
    return <div className="bpage"><div className="bpage__loading">Chargement…</div></div>;
  }
  if (error || !bankroll) {
    return (
      <div className="bpage">
        <button className="blink" onClick={() => navigate('/paris')}>← Paris sportifs</button>
        <p className="bpage__error">{error || 'Bankroll introuvable.'}</p>
      </div>
    );
  }

  const s = bankroll.stats;
  const color = bankroll.color || '#818cf8';

  return (
    <div className="bpage">
      <button className="blink bdetail__back" onClick={() => navigate('/paris')}>← Paris sportifs</button>

      {/* En-tête : identité + KPIs toujours visibles */}
      <header className="bdetail__head" style={{ '--c': color }}>
        <div className="bdetail__id">
          <span className="bdetail__icon">{bankroll.icon || '🎰'}</span>
          <div>
            <h1 className="bdetail__title">{bankroll.name}</h1>
            {bankroll.bookmaker && <p className="bdetail__sub">{bankroll.bookmaker}</p>}
          </div>
        </div>
        <div className="bdetail__actions">
          <button className="btn btn--primary btn--sm" onClick={() => setBetModal(true)}>+ Pari</button>
          <button className="btn btn--ghost btn--sm" onClick={() => setEditModal(true)}>Éditer</button>
        </div>
      </header>

      <section className="bdetail__kpis">
        <div className="bkpi">
          <span className="bkpi__label">Capital actuel</span>
          <span className="bkpi__value">{formatEur(s.currentCapital)}</span>
        </div>
        <div className="bkpi">
          <span className="bkpi__label">Progression</span>
          <span className={`bkpi__value t-${trendClass(s.progression)}`}>{formatPct(s.progression, { signed: true })}</span>
        </div>
        <div className="bkpi">
          <span className="bkpi__label">Bénéfice</span>
          <span className={`bkpi__value t-${trendClass(s.profit)}`}>{formatSignedEur(s.profit)}</span>
        </div>
        <div className="bkpi">
          <span className="bkpi__label">ROI</span>
          <span className="bkpi__value">{formatPct(s.roi)}</span>
        </div>
        <div className="bkpi">
          <span className="bkpi__label">Paris</span>
          <span className="bkpi__value">{s.betCount}</span>
        </div>
      </section>

      {/* Onglets */}
      <nav className="btabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`btabs__item${tab === t.id ? ' btabs__item--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'bets' && s.betCount > 0 && <span className="btabs__badge">{s.betCount}</span>}
          </button>
        ))}
      </nav>

      {tab === 'overview' && <OverviewTab bankroll={bankroll} />}
      {tab === 'bets' && (
        <BetsTab
          bankroll={bankroll}
          filter={betFilter}
          onFilter={setBetFilter}
          onAddBet={() => setBetModal(true)}
          onSettleBet={settleBet}
          onSettleSelection={settleSelection}
          onDeleteBet={deleteBet}
        />
      )}
      {tab === 'stats' && <StatsTab stats={s} />}

      {editModal && (
        <BankrollFormModal
          bankroll={bankroll}
          onSave={saveBankroll}
          onArchive={archiveBankroll}
          onDelete={deleteBankroll}
          onClose={() => setEditModal(false)}
        />
      )}
      {betModal && <BetFormModal onSave={createBet} onClose={() => setBetModal(false)} />}

      {toast && <div className="btoast">{toast}</div>}
    </div>
  );
}
