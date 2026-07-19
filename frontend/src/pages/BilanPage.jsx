import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { financesApi } from '../api/finances';
import {
  TYPE_META,
  TYPE_ORDER,
  formatEur,
  formatDaysAgo,
} from '../components/finances/constants';
import { todayStr } from '../utils/date';
import './FinancesPage.css';
import './BilanPage.css';
import { toast } from '../components/toast';

/**
 * « Bilan du mois » (#1) : met à jour le solde de toutes les enveloppes actives à une
 * même date, en une seule passe (saisie groupée → POST /finances/snapshots/bulk).
 */
export default function BilanPage() {
  const navigate = useNavigate();
  const [envelopes, setEnvelopes] = useState(null);
  const [date, setDate] = useState(todayStr());
  const [inputs, setInputs] = useState({}); // id -> { amount, gain }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await financesApi.envelopes();
      setEnvelopes(data);
      // Pré-remplit chaque ligne avec le solde courant (l'utilisateur n'édite que ce qui change).
      const init = {};
      for (const e of data) {
        init[e.id] = {
          amount: e.balance != null ? String(e.balance) : '',
          gain: e.gain != null ? String(e.gain) : '',
        };
      }
      setInputs(init);
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

  const groups = useMemo(() => {
    const byType = new Map();
    for (const e of envelopes ?? []) {
      const arr = byType.get(e.type);
      if (arr) arr.push(e);
      else byType.set(e.type, [e]);
    }
    return TYPE_ORDER.filter((t) => byType.has(t)).map((t) => ({
      type: t,
      meta: TYPE_META[t],
      items: byType.get(t),
    }));
  }, [envelopes]);

  function setField(id, key, value) {
    setInputs((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
  }

  async function submit() {
    setSaving(true);
    setError('');
    try {
      const items = [];
      for (const e of envelopes) {
        const raw = inputs[e.id]?.amount ?? '';
        if (raw.trim() === '') continue;
        const item = { envelopeId: e.id, amount: parseAmount(raw) };
        if (e.type === 'investissement') {
          const g = inputs[e.id]?.gain ?? '';
          if (g.trim() !== '') item.gain = parseAmount(g, true);
        }
        items.push(item);
      }
      if (items.length === 0) {
        setError('Aucun solde à enregistrer.');
        setSaving(false);
        return;
      }
      await financesApi.bulkSnapshots({ date, items });
      toast(`Bilan enregistré (${items.length} enveloppe(s)).`);
      navigate('/finances');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="fpage">
      <header className="page-head">
        <div>
          <h1 className="page-head__title">🧾 Bilan du mois</h1>
        </div>
      </header>

      <p className="fbilan__intro">
        Mettez à jour le solde de vos enveloppes à une même date, en une passe.
        Les lignes laissées vides sont ignorées.
      </p>

      <div className="fbilan__bar">
        <label className="ffield fbilan__date">
          <span className="ffield__label">Date du bilan</span>
          <input
            className="ffield__input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <button
          className="btn btn--primary"
          onClick={submit}
          disabled={saving || loading}
        >
          {saving ? '…' : 'Enregistrer le bilan'}
        </button>
      </div>

      {error && <p className="fpage__error">{error}</p>}
      {loading && <p className="fpage__loading">Chargement…</p>}

      {!loading && groups.length === 0 && (
        <p className="fempty">
          Aucune enveloppe à mettre à jour.{' '}
          <Link to="/finances/enveloppes">Créer une enveloppe</Link>.
        </p>
      )}

      {groups.map((g) => (
        <section key={g.type} className="fgroup">
          <div className="fgroup__head" style={{ '--c': g.meta.color }}>
            <span className="fgroup__icon">{g.meta.icon}</span>
            <span className="fgroup__label">{g.meta.label}</span>
          </div>
          <ul className="fbilan__list">
            {g.items.map((e) => {
              const isInvest = e.type === 'investissement';
              return (
                <li
                  key={e.id}
                  className={`fbilan__row${e.stale ? ' fbilan__row--stale' : ''}`}
                >
                  <span
                    className="fbilan__icon"
                    style={{ '--c': e.color || g.meta.color }}
                  >
                    {e.icon || g.meta.icon}
                  </span>
                  <span className="fbilan__name">
                    {e.name}
                    {e.stale && (
                      <span className="fbilan__tag">à actualiser</span>
                    )}
                  </span>
                  <span className="fbilan__current">
                    {e.balance == null ? '—' : formatEur(e.balance)}
                    <span className="fbilan__ago">
                      {e.lastSnapshotDate
                        ? formatDaysAgo(e.daysSinceUpdate)
                        : 'jamais'}
                    </span>
                  </span>
                  <span className="fbilan__inputs">
                    <input
                      className="ffield__input fbilan__input"
                      type="text"
                      inputMode="decimal"
                      value={inputs[e.id]?.amount ?? ''}
                      placeholder={isInvest ? 'Valeur (€)' : 'Solde (€)'}
                      onChange={(ev) =>
                        setField(e.id, 'amount', ev.target.value)
                      }
                    />
                    {isInvest && (
                      <input
                        className="ffield__input fbilan__input"
                        type="text"
                        inputMode="decimal"
                        value={inputs[e.id]?.gain ?? ''}
                        placeholder="Plus-value (€)"
                        onChange={(ev) =>
                          setField(e.id, 'gain', ev.target.value)
                        }
                      />
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

// "8 200,50" / "8200.5" → 8200.5. `signed` autorise le signe négatif.
function parseAmount(str, signed = false) {
  const cleaned = String(str).replace(/\s/g, '').replace(',', '.').trim();
  if (cleaned === '' || cleaned === '-') return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) throw new Error('Montant invalide.');
  return signed ? n : Math.abs(n);
}
