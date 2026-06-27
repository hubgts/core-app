import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bettingApi } from '../api/betting';
import BankrollFormModal from '../components/betting/BankrollFormModal';
import {
  formatEur,
  formatPct,
  formatSignedEur,
  trendClass,
} from '../components/betting/constants';
import './BettingPage.css';

export default function BettingPage() {
  const navigate = useNavigate();
  const [bankrolls, setBankrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setBankrolls(await bettingApi.bankrolls());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  }

  async function createBankroll(payload) {
    const detail = await bettingApi.createBankroll(payload);
    setModal(false);
    flash('Bankroll créée.');
    navigate(`/paris/${detail.id}`);
  }

  if (loading) {
    return (
      <div className="bpage">
        <div className="bpage__loading">Chargement…</div>
      </div>
    );
  }

  return (
    <div className="bpage">
      <header className="bpage__head">
        <h1 className="bpage__title">🎰 Paris sportifs</h1>
        <button className="btn btn--primary" onClick={() => setModal(true)}>
          + Bankroll
        </button>
      </header>

      {error && <p className="bpage__error">{error}</p>}

      {bankrolls.length === 0 ? (
        <p className="bempty">
          Aucune bankroll pour l'instant. Créez-en une pour commencer à suivre vos paris.
        </p>
      ) : (
        <div className="bcards">
          {bankrolls.map((b) => {
            const s = b.stats;
            return (
              <button
                key={b.id}
                className="bcard"
                style={{ '--c': b.color || '#818cf8' }}
                onClick={() => navigate(`/paris/${b.id}`)}
              >
                <div className="bcard__head">
                  <span className="bcard__icon">{b.icon || '🎰'}</span>
                  <span className="bcard__name">{b.name}</span>
                </div>
                <div className="bcard__capital">{formatEur(s.currentCapital)}</div>
                <div className={`bcard__prog t-${trendClass(s.progression)}`}>
                  {formatPct(s.progression, { signed: true })}
                  <span className="bcard__proghint"> · bénéf. {formatSignedEur(s.profit)}</span>
                </div>
                <div className="bcard__foot">
                  <span>{s.betCount} pari{s.betCount > 1 ? 's' : ''}</span>
                  <span>ROI {formatPct(s.roi)}</span>
                  <span>Réussite {formatPct(s.successRate)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {modal && (
        <BankrollFormModal
          onSave={createBankroll}
          onClose={() => setModal(false)}
        />
      )}

      {toast && <div className="btoast">{toast}</div>}
    </div>
  );
}
