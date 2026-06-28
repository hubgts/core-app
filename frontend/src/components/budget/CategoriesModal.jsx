import { useCallback, useEffect, useRef, useState } from 'react';
import { budgetApi } from '../../api/budget';
import { BUDGET_COLORS, BUDGET_ICONS, DEFAULT_PLAN, monthLabel } from './constants';
import { confirmDialog } from '../dialogs';
import Combobox from '../Combobox';

const clamp = (n) => Math.min(Math.max(Math.round(n), 0), 100);

/**
 * Gestion du plan d'un **mois**. Deux niveaux nettement séparés :
 *  - l'**allocation du mois** (inclure une catégorie + son % cible) — la tâche fréquente ;
 *  - l'**édition du catalogue** (nom, couleur, icône, type, archive) — repliée derrière
 *    un bouton ✎ par catégorie. Le catalogue est partagé entre les mois.
 */
export default function CategoriesModal({ month, onClose, onChanged }) {
  const [rows, setRows] = useState([]); // catégories actives, ordonnées : { id, name, color, icon, kind, inPlan, targetPct }
  const [inherited, setInherited] = useState(false);
  const [source, setSource] = useState(null);
  const [archived, setArchived] = useState([]);
  const [refIncome, setRefIncome] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState('');
  const dragRef = useRef(null);

  const reload = useCallback(async () => {
    const [plan, all, settings] = await Promise.all([
      budgetApi.plan(month),
      budgetApi.categories(true),
      budgetApi.settings(),
    ]);
    setRows(plan.categories);
    setInherited(plan.inherited);
    setSource(plan.source);
    setArchived(all.filter((c) => c.status === 'archived'));
    setRefIncome(settings.plannedIncome != null ? String(settings.plannedIncome) : '');
  }, [month]);

  useEffect(() => {
    reload().catch((e) => setError(e.message));
  }, [reload]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close() {
    onChanged?.();
    onClose();
  }

  const included = rows.filter((r) => r.inPlan);
  const excluded = rows.filter((r) => !r.inPlan);
  const totalPct = included.reduce((s, r) => s + (Number(r.targetPct) || 0), 0);
  const rounded = Math.round(totalPct);

  // --- Persistance du plan du mois ---
  const savePlan = useCallback(async (nextRows) => {
    setError('');
    const items = nextRows
      .filter((r) => r.inPlan)
      .map((r) => ({ categoryId: r.id, targetPct: Number(r.targetPct) || 0 }));
    try {
      const res = await budgetApi.setPlan(month, items);
      setRows(res.categories);
      setInherited(res.inherited);
      setSource(res.source);
      onChanged?.();
    } catch (e) {
      setError(e.message);
    }
  }, [month, onChanged]);

  function setLocalPct(id, value) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, targetPct: value } : r)));
  }
  function stepPct(id, delta) {
    const next = rows.map((r) =>
      r.id === id ? { ...r, targetPct: clamp((Number(r.targetPct) || 0) + delta) } : r,
    );
    setRows(next);
    savePlan(next);
  }
  function setInPlan(id, inPlan) {
    const next = rows.map((r) => (r.id === id ? { ...r, inPlan } : r));
    setRows(next);
    savePlan(next);
  }
  function normalize() {
    if (totalPct <= 0) return;
    const next = rows.map((r) =>
      r.inPlan ? { ...r, targetPct: clamp(((Number(r.targetPct) || 0) / totalPct) * 100) } : r,
    );
    setRows(next);
    savePlan(next);
  }

  // --- Catalogue (global) ---
  async function patchCategory(id, patch) {
    setError('');
    try {
      await budgetApi.updateCategory(id, patch);
      await reload();
    } catch (e) {
      setError(e.message);
      await reload();
    }
  }
  function setLocalField(id, field, value) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  async function addCategory() {
    try {
      const cat = await budgetApi.createCategory({
        name: 'Nouvelle catégorie',
        kind: 'depense',
        color: BUDGET_COLORS[rows.length % BUDGET_COLORS.length],
      });
      const fresh = await budgetApi.plan(month);
      const items = fresh.categories
        .filter((c) => c.inPlan || c.id === cat.id)
        .map((c) => ({ categoryId: c.id, targetPct: c.id === cat.id ? 0 : c.targetPct }));
      const res = await budgetApi.setPlan(month, items);
      setRows(res.categories);
      setInherited(res.inherited);
      setSource(res.source);
      setEditingId(cat.id);
      onChanged?.();
    } catch (e) {
      setError(e.message);
    }
  }

  async function seedDefault() {
    try {
      const created = [];
      for (const c of DEFAULT_PLAN) created.push(await budgetApi.createCategory(c));
      await budgetApi.setPlan(
        month,
        created.map((cat, i) => ({ categoryId: cat.id, targetPct: DEFAULT_PLAN[i].targetPct })),
      );
      await reload();
      onChanged?.();
    } catch (e) {
      setError(e.message);
    }
  }

  async function archive(id) {
    setEditingId(null);
    await budgetApi.archiveCategory(id).then(reload).then(() => onChanged?.()).catch((e) => setError(e.message));
  }
  async function unarchive(id) {
    await budgetApi.unarchiveCategory(id).then(reload).then(() => onChanged?.()).catch((e) => setError(e.message));
  }
  async function remove(c) {
    if (!(await confirmDialog({ message: `Supprimer la catégorie « ${c.name} » ?`, danger: true }))) return;
    setEditingId(null);
    try {
      await budgetApi.removeCategory(c.id);
      await reload();
      onChanged?.();
    } catch (e) {
      setError(e.message);
    }
  }

  function onDrop(dropIndex) {
    const from = dragRef.current;
    dragRef.current = null;
    if (from == null || from === dropIndex) return;
    const next = [...included];
    const [moved] = next.splice(from, 1);
    next.splice(dropIndex, 0, moved);
    const newRows = [...next, ...excluded];
    setRows(newRows);
    budgetApi.reorderCategories(newRows.map((r) => r.id)).catch((e) => setError(e.message));
  }

  async function saveRefIncome() {
    try {
      await budgetApi.updateSettings({
        plannedIncome: refIncome.trim() === '' ? null : Number(refIncome.replace(',', '.')),
      });
    } catch (e) {
      setError(e.message);
    }
  }

  // Segments de la jauge d'équilibrage.
  let acc = 0;
  const segments = included.map((r) => {
    const pct = Math.max(Number(r.targetPct) || 0, 0);
    const seg = { id: r.id, color: r.color, left: Math.min(acc, 100), width: Math.min(pct, Math.max(0, 100 - acc)) };
    acc += pct;
    return seg;
  });

  function renderEditor(c) {
    return (
      <div className="bplan__editor">
        <div className="ffield-row">
          <label className="ffield">
            <span className="ffield__label">Nom</span>
            <input
              className="ffield__input"
              value={c.name}
              onChange={(e) => setLocalField(c.id, 'name', e.target.value)}
              onBlur={() => patchCategory(c.id, { name: c.name })}
            />
          </label>
          <label className="ffield bplan__kindfield">
            <span className="ffield__label">Type</span>
            <Combobox
              className="ffield__input"
              value={c.kind}
              onChange={(v) => patchCategory(c.id, { kind: v })}
              options={[
                { value: 'depense', label: 'Dépense' },
                { value: 'epargne', label: 'Épargne' },
              ]}
            />
          </label>
        </div>
        <div className="ffield">
          <span className="ffield__label">Icône</span>
          <div className="bplan__iconpick">
            {BUDGET_ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                className={`bplan__emojibtn${c.icon === ic ? ' bplan__emojibtn--active' : ''}`}
                onClick={() => patchCategory(c.id, { icon: ic })}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>
        <div className="ffield">
          <span className="ffield__label">Couleur</span>
          <div className="bplan__colorpick">
            {BUDGET_COLORS.map((col) => (
              <button
                key={col}
                type="button"
                className={`bplan__swatch${c.color === col ? ' bplan__swatch--active' : ''}`}
                style={{ background: col }}
                onClick={() => patchCategory(c.id, { color: col })}
                aria-label={`Couleur ${col}`}
              />
            ))}
          </div>
        </div>
        <div className="bplan__editoractions">
          <button className="btn btn--ghost btn--sm" onClick={() => archive(c.id)}>Archiver</button>
          <button className="btn btn--danger btn--sm" onClick={() => remove(c)}>Supprimer</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onMouseDown={close}>
      <div className="modal modal--xl bplan" onMouseDown={(e) => e.stopPropagation()}>
        <header className="bplan__head">
          <h2 className="modal__title">Plan de {monthLabel(month)}</h2>
          <button className="fdrawer__close" onClick={close} aria-label="Fermer">✕</button>
        </header>
        <p className="bplan__sub">
          Répartissez 100 % de votre revenu entre vos catégories. Le plan est propre à ce
          mois ; les catégories (noms, couleurs) sont partagées.
        </p>
        {inherited && source && (
          <p className="bplan__inherit">↩ Plan repris de <strong>{monthLabel(source)}</strong> — ajustez-le ci-dessous.</p>
        )}

        {rows.length === 0 ? (
          <div className="bplan__empty">
            <p>Aucune catégorie. Démarrez avec un modèle :</p>
            <button className="btn btn--primary" onClick={seedDefault}>Utiliser le modèle 50/30/20</button>
            <button className="btn btn--ghost" onClick={addCategory}>Créer une catégorie</button>
          </div>
        ) : (
          <>
            {/* Jauge d'équilibrage */}
            <div className="bplan__balance">
              <div className="bplan__gauge" role="img" aria-label={`Total ${rounded} %`}>
                {segments.map((s) => (
                  <span
                    key={s.id}
                    className="bplan__seg"
                    style={{ left: `${s.left}%`, width: `${s.width}%`, background: s.color }}
                  />
                ))}
              </div>
              <div className="bplan__baltext">
                <span className={`bplan__baltotal${rounded === 100 ? ' bplan__baltotal--ok' : rounded > 100 ? ' bplan__baltotal--over' : ''}`}>
                  {rounded} %
                </span>
                <span className="bplan__balhint">
                  {rounded === 100 ? 'équilibré ✓' : rounded < 100 ? `reste ${100 - rounded} % à répartir` : `${rounded - 100} % de trop`}
                </span>
                {rounded !== 100 && totalPct > 0 && (
                  <button className="fsumlink fsumlink--btn" onClick={normalize}>Normaliser à 100 %</button>
                )}
              </div>
            </div>

            {/* Catégories du plan */}
            <ul className="bplan__list">
              {included.map((c, idx) => (
                <li key={c.id} className={`bplan__row${editingId === c.id ? ' bplan__row--editing' : ''}`}>
                  <div
                    className="bplan__main"
                    draggable
                    onDragStart={() => (dragRef.current = idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(idx)}
                  >
                    <span className="bplan__grip" title="Glisser pour réordonner">⠿</span>
                    <span className="bplan__emoji" style={{ '--c': c.color }}>{c.icon || '•'}</span>
                    <div className="bplan__namewrap">
                      <span className="bplan__name">{c.name}</span>
                      <span className="bplan__bar">
                        <span className="bplan__barfill" style={{ width: `${Math.min(Number(c.targetPct) || 0, 100)}%`, background: c.color }} />
                      </span>
                    </div>
                    <div className="bplan__stepper">
                      <button className="bplan__step" onClick={() => stepPct(c.id, -5)} aria-label="−5 %">−</button>
                      <input
                        className="bplan__pctinput"
                        type="number"
                        min="0"
                        max="100"
                        value={c.targetPct}
                        onChange={(e) => setLocalPct(c.id, e.target.value)}
                        onBlur={() => savePlan(rows)}
                      />
                      <span className="bplan__pctsign">%</span>
                      <button className="bplan__step" onClick={() => stepPct(c.id, 5)} aria-label="+5 %">+</button>
                    </div>
                    <button
                      className={`bplan__iconbtn${editingId === c.id ? ' bplan__iconbtn--active' : ''}`}
                      title="Modifier la catégorie"
                      onClick={() => setEditingId(editingId === c.id ? null : c.id)}
                    >
                      ✎
                    </button>
                    <button className="bplan__iconbtn" title="Retirer du plan ce mois" onClick={() => setInPlan(c.id, false)}>
                      ×
                    </button>
                  </div>
                  {editingId === c.id && renderEditor(c)}
                </li>
              ))}
            </ul>

            <button className="btn btn--ghost btn--sm bplan__add" onClick={addCategory}>+ Ajouter une catégorie</button>

            {/* Hors du plan ce mois */}
            {excluded.length > 0 && (
              <div className="bplan__excluded">
                <span className="bplan__sectitle">Hors du plan ce mois</span>
                <ul className="bplan__list">
                  {excluded.map((c) => (
                    <li key={c.id} className="bplan__row bplan__row--off">
                      <div className="bplan__main">
                        <span className="bplan__emoji" style={{ '--c': c.color }}>{c.icon || '•'}</span>
                        <span className="bplan__name">{c.name}</span>
                        <span className="bplan__spacer" />
                        <button
                          className="bplan__iconbtn"
                          title="Modifier la catégorie"
                          onClick={() => setEditingId(editingId === c.id ? null : c.id)}
                        >
                          ✎
                        </button>
                        <button className="btn btn--ghost btn--sm" onClick={() => setInPlan(c.id, true)}>Inclure</button>
                      </div>
                      {editingId === c.id && renderEditor(c)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* Archivées */}
        {archived.length > 0 && (
          <div className="bplan__arch">
            <button className="bplan__archtoggle" onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? '▾' : '▸'} Archivées ({archived.length})
            </button>
            {showArchived && (
              <ul className="bplan__list">
                {archived.map((c) => (
                  <li key={c.id} className="bplan__row bplan__row--off">
                    <div className="bplan__main">
                      <span className="bplan__emoji" style={{ '--c': c.color }}>{c.icon || '•'}</span>
                      <span className="bplan__name">{c.name}</span>
                      <span className="bplan__spacer" />
                      <button className="btn btn--ghost btn--sm" onClick={() => unarchive(c.id)}>Réactiver</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Revenu de référence */}
        <label className="ffield bplan__ref">
          <span className="ffield__label">Revenu de référence (optionnel)</span>
          <input
            className="ffield__input"
            type="text"
            inputMode="decimal"
            value={refIncome}
            placeholder="Ex : 2000 — pré-rempli pour un nouveau mois"
            onChange={(e) => setRefIncome(e.target.value)}
            onBlur={saveRefIncome}
          />
        </label>

        {error && <p className="modal__error">{error}</p>}

        <div className="modal__actions">
          <div className="modal__actions-right">
            <button type="button" className="btn btn--primary" onClick={close}>Terminé</button>
          </div>
        </div>
      </div>
    </div>
  );
}
