import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { budgetApi } from '../api/budget';
import Combobox from '../components/Combobox';
import { confirmDialog } from '../components/dialogs';
import { toast } from '../components/toast';
import { formatEur, monthLabel } from '../components/budget/constants';
import './FinancesPage.css';
import './ImportPage.css';
import './ImportReviewPage.css';

const FILTERS = [
  { key: 'todo', label: 'À traiter' },
  { key: 'all', label: 'Tout' },
  { key: 'error', label: 'En erreur' },
  { key: 'dup', label: 'Doublons' },
];

/** Champs obligatoires manquants d'une ligne active (hors ignorée/doublon/erreur). */
function missing(r) {
  return (
    !r.kind ||
    !r.date ||
    !(Number(r.amount) > 0) ||
    (r.kind === 'sortie' && !r.categoryId)
  );
}
/** Une ligne « active » entre-t-elle dans le décompte à valider ? */
const isActive = (r) => !r.ignored && !r.duplicate && !r.error;

/**
 * Écran de vérification d'un import bancaire (`/budget/import/:id`), optimisé pour
 * la **saisie de masse** : les opérations sont **regroupées par marchand** et
 * repliées ; on choisit **une catégorie par groupe** (appliquée à toutes ses
 * lignes). On peut déplier un groupe pour ajuster une ligne. La progression est
 * auto-sauvegardée côté backend.
 */
export default function ImportReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [categories, setCategories] = useState([]);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('todo');
  const [open, setOpen] = useState(() => new Set()); // clés de groupes dépliés
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const dirty = useRef(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [b, cats] = await Promise.all([
          budgetApi.getImport(id),
          budgetApi.categories(),
        ]);
        if (b.status !== 'pending') {
          navigate('/budget/import', { replace: true });
          return;
        }
        setBatch(b);
        setRows(b.rows.map((r) => ({ ...r })));
        setCategories(cats);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  const catOptions = useMemo(
    () => [
      { value: '', label: '— Choisir —' },
      ...categories.map((c) => ({
        value: c.id,
        label: `${c.icon ? `${c.icon} ` : ''}${c.name}`,
      })),
    ],
    [categories],
  );

  const payload = useCallback(
    (list) =>
      list.map((r) => ({
        id: r.id,
        kind: r.kind,
        date: r.date,
        amount: r.amount === '' || r.amount == null ? null : Number(r.amount),
        categoryId: r.categoryId || null,
        label: r.label,
        ignored: r.ignored,
      })),
    [],
  );

  const scheduleSave = useCallback(
    (next) => {
      dirty.current = true;
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          await budgetApi.patchImport(id, payload(next));
          dirty.current = false;
        } catch {
          /* réessai au prochain changement / à la validation */
        }
      }, 700);
    },
    [id, payload],
  );

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const update = useCallback(
    (updater) => {
      setRows((prev) => {
        const next = updater(prev);
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  function patchRow(rowId, patch) {
    update((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const nr = { ...r, ...patch };
        if (nr.kind === 'entree') nr.categoryId = '';
        if (nr.error && nr.date && Number(nr.amount) > 0 && nr.kind)
          nr.error = null;
        return nr;
      }),
    );
  }

  /** Applique une catégorie à toutes les dépenses actives d'un groupe. */
  function setGroupCategory(memberIds, categoryId) {
    const ids = new Set(memberIds);
    update((prev) =>
      prev.map((r) =>
        ids.has(r.id) && r.kind === 'sortie' && isActive(r)
          ? { ...r, categoryId }
          : r,
      ),
    );
  }

  /** Ignore / réintègre toutes les lignes d'un groupe. */
  function setGroupIgnored(memberIds, ignored) {
    const ids = new Set(memberIds);
    update((prev) => prev.map((r) => (ids.has(r.id) ? { ...r, ignored } : r)));
  }

  // --- Regroupement par marchand ---
  const groups = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const key = r.merchantKey || `#${r.label || r.id}`;
      let g = map.get(key);
      if (!g)
        map.set(
          key,
          (g = { key, name: r.merchantKey || r.label || '—', rows: [] }),
        );
      g.rows.push(r);
    }
    return [...map.values()].map((g) => {
      const active = g.rows.filter(isActive);
      const cats = new Set(
        active
          .filter((r) => r.kind === 'sortie')
          .map((r) => r.categoryId || ''),
      );
      const total = active.reduce(
        (s, r) => s + (r.kind === 'entree' ? 1 : -1) * (Number(r.amount) || 0),
        0,
      );
      return {
        ...g,
        activeCount: active.length,
        total,
        // catégorie commune si unique (sinon « mixte »)
        commonCat: cats.size === 1 ? [...cats][0] : null,
        mixed: cats.size > 1,
        hasError: g.rows.some((r) => r.error),
        hasDup: g.rows.some((r) => r.duplicate),
        todo: active.some((r) => missing(r)),
        latestDate: active.reduce(
          (d, r) => (r.date && r.date > d ? r.date : d),
          '',
        ),
      };
    });
  }, [rows]);

  const counts = {
    all: groups.length,
    todo: groups.filter((g) => g.todo).length,
    error: rows.filter((r) => r.error).length,
    dup: rows.filter((r) => r.duplicate).length,
  };

  const visibleGroups = useMemo(() => {
    let list = groups;
    if (filter === 'todo') list = groups.filter((g) => g.todo);
    else if (filter === 'error') list = groups.filter((g) => g.hasError);
    else if (filter === 'dup') list = groups.filter((g) => g.hasDup);
    // À traiter d'abord, puis par montant décroissant (les gros postes en tête).
    return [...list].sort((a, b) => {
      if (a.todo !== b.todo) return a.todo ? -1 : 1;
      return Math.abs(b.total) - Math.abs(a.total);
    });
  }, [groups, filter]);

  const activeRows = rows.filter(isActive);
  const toCategorize = activeRows.filter((r) => missing(r));
  const canValidate = activeRows.length > 0 && toCategorize.length === 0;

  function toggle(key) {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function flush() {
    clearTimeout(saveTimer.current);
    if (dirty.current) {
      await budgetApi.patchImport(id, payload(rows));
      dirty.current = false;
    }
  }

  async function validate() {
    setBusy(true);
    setError('');
    try {
      await budgetApi.validateImport(id, payload(rows));
      toast('Import validé — transactions ajoutées à Plan & dépenses.');
      navigate('/budget/import');
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  async function leave() {
    try {
      await flush();
    } catch {
      /* on quitte quand même */
    }
    navigate('/budget/import');
  }

  async function discard() {
    if (
      !(await confirmDialog({
        message: 'Abandonner cet import ? Les lignes détectées seront perdues.',
        danger: true,
      }))
    )
      return;
    try {
      clearTimeout(saveTimer.current);
      await budgetApi.removeImport(id);
      toast('Import abandonné.');
      navigate('/budget/import');
    } catch (e) {
      toast(e.message);
    }
  }

  if (loading) {
    return (
      <div className="fpage">
        <div className="fpage__loading">Chargement…</div>
      </div>
    );
  }
  if (!batch) {
    return (
      <div className="fpage">
        <p className="fpage__error">{error || 'Import introuvable.'}</p>
      </div>
    );
  }

  const months = [
    ...new Set(activeRows.filter((r) => r.date).map((r) => r.date.slice(0, 7))),
  ].sort();

  return (
    <div className="fpage irev">
      <header className="fpage__head">
        <div className="irev__head-left">
          <button className="irev__back" onClick={leave}>
            ← Imports
          </button>
          <div>
            <h1 className="fpage__title irev__title">Vérifier l’import</h1>
            <p className="irev__sub">
              {batch.fileName} · {activeRows.length} opérations ·{' '}
              {groups.length} marchands
              {months.length > 0 && ` · ${months.map(monthLabel).join(', ')}`}
            </p>
          </div>
        </div>
      </header>

      {error && <p className="fpage__error">{error}</p>}

      <div className="irev__filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`irev__filter${filter === f.key ? ' is-active' : ''}`}
            onClick={() => setFilter(f.key)}
            disabled={
              f.key !== 'all' && f.key !== 'todo' && counts[f.key] === 0
            }
          >
            {f.label}
            <span className="irev__filtercount">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {visibleGroups.length === 0 ? (
        <p className="fempty irev__empty">
          {filter === 'todo'
            ? '🎉 Tout est catégorisé. Vous pouvez valider.'
            : 'Aucun marchand dans ce filtre.'}
        </p>
      ) : (
        <ul className="irev__groups">
          {visibleGroups.map((g) => (
            <MerchantGroup
              key={g.key}
              group={g}
              expanded={open.has(g.key)}
              catOptions={catOptions}
              onToggle={() => toggle(g.key)}
              onSetCategory={(catId) =>
                setGroupCategory(
                  g.rows.map((r) => r.id),
                  catId,
                )
              }
              onIgnoreAll={(ig) =>
                setGroupIgnored(
                  g.rows.map((r) => r.id),
                  ig,
                )
              }
              onPatchRow={patchRow}
            />
          ))}
        </ul>
      )}

      <div className="irev__bar">
        <div className="irev__barinfo">
          {toCategorize.length > 0 ? (
            <span className="irev__barwarn">
              {toCategorize.length} opération(s) à catégoriser
            </span>
          ) : (
            <span className="irev__barok">
              Prêt : {activeRows.length} opération(s) à importer
            </span>
          )}
        </div>
        <div className="irev__baractions">
          <button className="btn btn--ghost" onClick={discard} disabled={busy}>
            Abandonner
          </button>
          <button
            className="btn btn--primary"
            onClick={validate}
            disabled={busy || !canValidate}
            title={
              canValidate
                ? undefined
                : 'Catégorisez toutes les dépenses restantes.'
            }
          >
            {busy ? '…' : `Valider (${activeRows.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Un groupe marchand : en-tête catégorisable + liste compacte dépliable. */
function MerchantGroup({
  group,
  expanded,
  catOptions,
  onToggle,
  onSetCategory,
  onIgnoreAll,
  onPatchRow,
}) {
  const g = group;
  const allIgnored = g.rows.every((r) => r.ignored);
  const onlyIncome =
    g.rows.filter(isActive).every((r) => r.kind === 'entree') &&
    g.activeCount > 0;

  const cls = [
    'irev__grp',
    g.todo ? 'is-todo' : '',
    g.hasError ? 'is-error' : '',
    allIgnored ? 'is-ignored' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li className={cls}>
      <div className="irev__grphead">
        <button
          className="irev__grptoggle"
          onClick={onToggle}
          aria-expanded={expanded}
          title={expanded ? 'Replier' : 'Déplier les opérations'}
        >
          <span className={`irev__chev${expanded ? ' is-open' : ''}`}>▸</span>
          <span className="irev__grpname" title={g.name}>
            {g.name}
          </span>
        </button>

        <span className="irev__grpstat">
          {g.activeCount} op.
          <span
            className={`irev__grptotal ${g.total >= 0 ? 't-up' : 't-down'}`}
          >
            {formatEur(g.total)}
          </span>
        </span>

        {onlyIncome ? (
          <span className="irev__grpincome">Revenus</span>
        ) : (
          <div className="irev__grpcat">
            <Combobox
              className="ffield__input"
              value={g.commonCat || ''}
              onChange={onSetCategory}
              placeholder={
                g.mixed ? 'Catégories mixtes' : 'Catégorie du groupe…'
              }
              options={catOptions}
            />
          </div>
        )}

        <button
          className="irev__ignore"
          onClick={() => onIgnoreAll(!allIgnored)}
          title={allIgnored ? 'Réintégrer le groupe' : 'Ignorer le groupe'}
        >
          {allIgnored ? '↩' : '✕'}
        </button>
      </div>

      {expanded && (
        <ul className="irev__lines">
          {g.rows.map((r) => (
            <LineRow
              key={r.id}
              row={r}
              catOptions={catOptions}
              onPatch={(p) => onPatchRow(r.id, p)}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Ligne compacte d'une opération dans un groupe déplié. */
function LineRow({ row, catOptions, onPatch }) {
  const cls = [
    'irev__line',
    row.ignored ? 'is-ignored' : '',
    row.error ? 'is-error' : '',
    row.duplicate ? 'is-dup' : '',
    isActive(row) && missing(row) ? 'is-todo' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li className={cls}>
      {/* Libellé complet (tronqué, complet au survol) — l'info qui guide le choix */}
      <span className="irev__llabel" title={row.label || ''}>
        <button
          className={`irev__kind ${row.kind === 'entree' ? 'is-in' : 'is-out'}`}
          onClick={() =>
            onPatch({ kind: row.kind === 'entree' ? 'sortie' : 'entree' })
          }
          disabled={row.ignored}
          title="Basculer dépense / revenu"
        >
          {row.kind === 'entree' ? 'Rev.' : 'Dép.'}
        </button>
        <span className="irev__ltext">
          {row.label || <em>Sans libellé</em>}
        </span>
        {row.duplicate && <span className="irev__ltag">déjà importé</span>}
        {row.error && <span className="irev__ltag is-err">{row.error}</span>}
      </span>

      {/* Catégorie */}
      {row.kind === 'sortie' && !row.ignored ? (
        <Combobox
          className="ffield__input irev__lcat"
          value={row.categoryId || ''}
          onChange={(v) => onPatch({ categoryId: v })}
          placeholder="Catégorie…"
          options={catOptions}
        />
      ) : (
        <span className="irev__lcat irev__lna">—</span>
      )}

      {/* Montant */}
      <input
        className={`ffield__input irev__lamount ${row.kind === 'entree' ? 't-up' : ''}`}
        type="text"
        inputMode="decimal"
        value={row.amount ?? ''}
        placeholder="0,00"
        disabled={row.ignored}
        onChange={(e) => onPatch({ amount: e.target.value.replace(',', '.') })}
      />

      {/* Date */}
      <input
        className="ffield__input irev__ldate"
        type="date"
        value={row.date || ''}
        disabled={row.ignored}
        onChange={(e) => onPatch({ date: e.target.value || null })}
      />

      <button
        className="irev__ignore irev__ignore--sm"
        onClick={() => onPatch({ ignored: !row.ignored })}
        title={row.ignored ? 'Réintégrer' : 'Ignorer'}
      >
        {row.ignored ? '↩' : '✕'}
      </button>
    </li>
  );
}
