import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { financesApi } from '../api/finances';
import { confirmDialog } from '../components/dialogs';
import EnvelopeCard from '../components/finances/EnvelopeCard';
import EnvelopeFormModal from '../components/finances/EnvelopeFormModal';
import EnvelopeDrawer from '../components/finances/EnvelopeDrawer';
import {
  TYPE_META,
  TYPE_ORDER,
  formatEur,
} from '../components/finances/constants';
import './FinancesPage.css';
import './EnvelopesPage.css';
import { toast } from '../components/toast';

/**
 * Page de gestion des enveloppes : grille de cartes par type (réordonnables par
 * glisser-déposer), mise à jour rapide, objectifs, et section des archivées.
 */
export default function EnvelopesPage() {
  const [active, setActive] = useState([]);
  const [archived, setArchived] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const [modal, setModal] = useState(null); // { envelope? } | null
  const [drawer, setDrawer] = useState(null); // détail d'enveloppe | null
  const [drawerAdding, setDrawerAdding] = useState(false);
  const dragRef = useRef(null); // { type, index }

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await financesApi.envelopes(true);
      setActive(data.filter((e) => e.status === 'active'));
      setArchived(data.filter((e) => e.status === 'archived'));
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
    for (const e of active) {
      const arr = byType.get(e.type);
      if (arr) arr.push(e);
      else byType.set(e.type, [e]);
    }
    return TYPE_ORDER.filter((t) => byType.has(t)).map((t) => ({
      type: t,
      meta: TYPE_META[t],
      items: byType.get(t),
    }));
  }, [active]);

  const staleCount = active.filter((e) => e.stale).length;

  // --- Drag & drop (réordonnancement au sein d'un type) ---------------------
  function onDrop(type, dropIndex) {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.type !== type || d.index === dropIndex) return;
    const groupItems = active.filter((e) => e.type === type);
    const [moved] = groupItems.splice(d.index, 1);
    groupItems.splice(dropIndex, 0, moved);
    // Reconstruit la liste globale en conservant l'ordre des groupes (TYPE_ORDER).
    const next = [];
    for (const t of TYPE_ORDER) {
      if (t === type) next.push(...groupItems);
      else next.push(...active.filter((e) => e.type === t));
    }
    setActive(next);
    financesApi
      .reorder(next.map((e) => e.id))
      .catch((e) => toast(`Erreur : ${e.message}`));
  }

  async function openDrawer(id, adding = false) {
    try {
      const detail = await financesApi.envelope(id);
      setDrawerAdding(adding);
      setDrawer(detail);
    } catch (e) {
      toast(e.message);
    }
  }

  async function saveEnvelope(payload) {
    if (modal?.envelope) {
      await financesApi.update(modal.envelope.id, payload);
      toast('Enveloppe mise à jour.');
    } else {
      await financesApi.create(payload);
      toast('Enveloppe créée.');
    }
    setModal(null);
    await load();
  }

  async function archiveEnvelope(envelope) {
    await financesApi.archive(envelope.id);
    setModal(null);
    setDrawer(null);
    toast('Enveloppe archivée.');
    await load();
  }

  async function unarchiveEnvelope(envelope) {
    await financesApi.unarchive(envelope.id);
    setDrawer(null);
    toast('Enveloppe réactivée.');
    await load();
  }

  async function deleteEnvelope(envelope) {
    const n = envelope.snapshotCount ?? 0;
    const msg =
      n > 0
        ? `Supprimer « ${envelope.name} » et ses ${n} relevé(s) ? Cette action est irréversible.\n\nAstuce : « Archiver » conserve l'historique.`
        : `Supprimer « ${envelope.name} » ?`;
    if (!(await confirmDialog({ message: msg, danger: true }))) return;
    await financesApi.remove(envelope.id);
    setModal(null);
    setDrawer(null);
    toast('Enveloppe supprimée.');
    await load();
  }

  async function updateSnapshot(date, data) {
    const detail = await financesApi.setSnapshot(drawer.id, date, data);
    setDrawer(detail);
    toast('Solde mis à jour.');
    await load();
  }

  async function deleteSnapshot(snapshotId) {
    if (
      !(await confirmDialog({ message: 'Supprimer ce relevé ?', danger: true }))
    )
      return;
    const detail = await financesApi.removeSnapshot(snapshotId);
    setDrawer(detail);
    toast('Relevé supprimé.');
    await load();
  }

  return (
    <div className="fpage">
      <header className="fpage__head">
        <div className="fpage__headtext">
          <h1 className="fpage__title">💰 Enveloppes</h1>
          <Link className="fsumlink" to="/finances">
            ← Vue d'ensemble
          </Link>
        </div>
        <div className="fpage__headactions">
          <Link className="btn btn--ghost" to="/finances/bilan">
            🧾 Faire le bilan
          </Link>
          <button className="btn btn--primary" onClick={() => setModal({})}>
            + Enveloppe
          </button>
        </div>
      </header>

      {error && <p className="fpage__error">{error}</p>}

      {staleCount > 0 && (
        <Link className="freminder" to="/finances/bilan">
          ⚠ {staleCount} enveloppe{staleCount > 1 ? 's' : ''} à actualiser —
          faire le bilan →
        </Link>
      )}

      {!loading && groups.length === 0 && (
        <p className="fempty">
          Aucune enveloppe pour l'instant. Créez votre première enveloppe pour
          commencer à suivre votre patrimoine.
        </p>
      )}

      {groups.map((g) => (
        <section key={g.type} className="fgroup">
          <div className="fgroup__head" style={{ '--c': g.meta.color }}>
            <span className="fgroup__icon">{g.meta.icon}</span>
            <span className="fgroup__label">{g.meta.label}</span>
          </div>
          <div className="fcards">
            {g.items.map((e, idx) => (
              <div
                key={e.id}
                className="fcard-drag"
                draggable
                onDragStart={() =>
                  (dragRef.current = { type: g.type, index: idx })
                }
                onDragOver={(ev) => ev.preventDefault()}
                onDrop={() => onDrop(g.type, idx)}
              >
                <EnvelopeCard envelope={e} onOpen={openDrawer} />
              </div>
            ))}
          </div>
        </section>
      ))}

      {archived.length > 0 && (
        <section className="farch">
          <button
            className="farch__toggle"
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? '▾' : '▸'} Archivées ({archived.length})
          </button>
          {showArchived && (
            <ul className="fenvlist farch__list">
              {archived.map((e) => {
                const meta = TYPE_META[e.type];
                return (
                  <li key={e.id} className="fenv fenv--arch">
                    <span
                      className="fenv__icon"
                      style={{ '--c': e.color || meta.color }}
                    >
                      {e.icon || meta.icon}
                    </span>
                    <span className="fenv__name">{e.name}</span>
                    <span className="fenv__amount">
                      {e.balance == null ? '—' : formatEur(e.balance)}
                    </span>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => unarchiveEnvelope(e)}
                    >
                      Réactiver
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {modal && (
        <EnvelopeFormModal
          envelope={modal.envelope}
          onSave={saveEnvelope}
          onArchive={archiveEnvelope}
          onDelete={deleteEnvelope}
          onClose={() => setModal(null)}
        />
      )}

      {drawer && (
        <EnvelopeDrawer
          envelope={drawer}
          defaultAdding={drawerAdding}
          onUpdateSnapshot={updateSnapshot}
          onDeleteSnapshot={deleteSnapshot}
          onUnarchive={unarchiveEnvelope}
          onEdit={(envelope) => {
            setDrawer(null);
            setModal({ envelope });
          }}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}
