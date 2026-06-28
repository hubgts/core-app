import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { courseApi } from '../api/course';
import {
  alertDialog,
  confirmDialog,
  promptDialog,
} from '../components/dialogs';
import ArticlePicker from '../components/course/ArticlePicker';
import ImportRecipeModal from '../components/course/ImportRecipeModal';
import {
  COMMON_UNITS,
  formatMeasure,
  groupByAisle,
} from '../components/course/constants';
import { frenchFullDate } from '../utils/date';
import './CoursePage.css';

export default function ShoppingListPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [hidePicked, setHidePicked] = useState(false);
  const [importing, setImporting] = useState(false);

  // Brouillon d'ajout d'item.
  const [draft, setDraft] = useState({
    articleId: null,
    articleName: '',
    name: '',
    unit: '',
  });
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('');
  const pickerKey = useRef(0);

  const load = useCallback(async () => {
    setError('');
    try {
      setList(await courseApi.getList(id));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(fn) {
    setError('');
    try {
      const updated = await fn();
      if (updated && updated.id) setList(updated);
      else await load();
    } catch (e) {
      setError(e.message);
    }
  }

  function pickArticle(picked) {
    setDraft(picked);
    if (!unit && picked.unit) setUnit(picked.unit);
  }

  async function addItem() {
    const hasArticle = draft.articleId || draft.articleName;
    if (!hasArticle) return;
    const payload = {
      articleId: draft.articleId ?? undefined,
      articleName: draft.articleId ? undefined : draft.articleName,
      quantity: qty === '' ? null : Number(qty),
      unit: unit || null,
    };
    await run(() => courseApi.addItem(id, payload));
    setDraft({ articleId: null, articleName: '', name: '', unit: '' });
    setQty('');
    setUnit('');
    pickerKey.current += 1; // remet le picker à vide
  }

  async function rename() {
    const next = await promptDialog({
      title: 'Renommer la liste',
      defaultValue: list.title,
    });
    if (next == null || !next.trim() || next.trim() === list.title) return;
    run(() => courseApi.updateList(id, { title: next.trim() }));
  }

  async function saveAsTemplate() {
    const title = await promptDialog({
      title: 'Nom du modèle',
      defaultValue: list.title,
    });
    if (title == null) return;
    run(() => courseApi.saveAsTemplate(id, { title: title.trim() }));
  }

  async function applyTemplate() {
    let templates = [];
    try {
      templates = await courseApi.templates();
    } catch (e) {
      setError(e.message);
      return;
    }
    if (templates.length === 0) {
      await alertDialog('Aucun modèle disponible. Crée-en un d’abord.');
      return;
    }
    const choices = templates
      .map((t, i) => `${i + 1}. ${t.title} (${t.itemCount})`)
      .join('\n');
    const pick = await promptDialog({
      title: 'Appliquer quel modèle ?',
      message: choices,
      defaultValue: '1',
      placeholder: 'Numéro du modèle',
    });
    const idx = Number(pick) - 1;
    if (!Number.isInteger(idx) || idx < 0 || idx >= templates.length) return;
    run(() => courseApi.applyTemplate(id, templates[idx].id));
  }

  async function removeList() {
    if (
      !(await confirmDialog({
        message: `Supprimer « ${list.title} » ? Action irréversible.`,
        danger: true,
      }))
    )
      return;
    run(async () => {
      await courseApi.removeList(id);
      navigate('/course');
    });
  }

  if (loading)
    return (
      <div className="course-page">
        <p className="course-empty">Chargement…</p>
      </div>
    );
  if (!list)
    return (
      <div className="course-page">
        <p className="modal__error">{error || 'Liste introuvable.'}</p>
      </div>
    );

  const visibleItems = hidePicked
    ? list.items.filter((i) => !i.checked)
    : list.items;
  const groups = groupByAisle(visibleItems);

  return (
    <div className="course-page">
      <header className="page-head">
        <div className="course-detailhead">
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => navigate('/course')}
          >
            ← Course
          </button>
          <h1
            className="page-head__title course-detailhead__title"
            onClick={rename}
            title="Renommer"
          >
            🛒 {list.title}
          </h1>
          {list.date && (
            <span className="course-detailhead__date">
              {frenchFullDate(list.date)}
            </span>
          )}
        </div>
        <div className="course-detail__counts">
          {list.checkedCount} / {list.itemCount} pris
        </div>
      </header>

      <div className="course-detail__toolbar">
        <button
          className="btn btn--sm btn--ghost"
          onClick={() => setImporting(true)}
        >
          + Recette
        </button>
        <button className="btn btn--sm btn--ghost" onClick={applyTemplate}>
          Appliquer un modèle
        </button>
        <button className="btn btn--sm btn--ghost" onClick={saveAsTemplate}>
          Enregistrer comme modèle
        </button>
        <button
          className="btn btn--sm btn--ghost"
          onClick={() => run(() => courseApi.uncheckAll(id))}
        >
          Tout décocher
        </button>
        <button
          className="btn btn--sm btn--ghost"
          onClick={() => run(() => courseApi.clearChecked(id))}
        >
          Vider les pris
        </button>
        <label className="course-detail__hide">
          <input
            type="checkbox"
            checked={hidePicked}
            onChange={(e) => setHidePicked(e.target.checked)}
          />
          Masquer les pris
        </label>
        <button
          className="btn btn--sm btn--ghost course-detail__del"
          onClick={removeList}
        >
          Supprimer
        </button>
      </div>

      {error && <p className="modal__error">{error}</p>}

      {list.items.length === 0 ? (
        <p className="course-empty">
          Liste vide. Ajoute un article ci-dessous ou importe une recette.
        </p>
      ) : (
        <div className="course-sections">
          {groups.map((g) => (
            <section key={g.aisleId ?? 'none'} className="course-section">
              <h2 className="course-section__head">
                <span>{g.icon}</span> {g.name}
              </h2>
              <ul className="course-items">
                {g.items.map((it) => (
                  <li
                    key={it.id}
                    className={`course-item${it.checked ? ' is-checked' : ''}`}
                  >
                    <label className="course-item__main">
                      <input
                        type="checkbox"
                        checked={it.checked}
                        onChange={() =>
                          run(() => courseApi.toggleItem(id, it.id))
                        }
                      />
                      <span className="course-item__qty">
                        {formatMeasure(it.quantity, it.unit)}
                      </span>
                      <span className="course-item__label">{it.label}</span>
                      {it.note && (
                        <span className="course-item__note">{it.note}</span>
                      )}
                    </label>
                    <button
                      className="icon-btn"
                      onClick={() => run(() => courseApi.removeItem(id, it.id))}
                      aria-label="Supprimer"
                      title="Supprimer"
                    >
                      🗑
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* Barre d'ajout */}
      <div className="course-addbar">
        <ArticlePicker
          key={pickerKey.current}
          placeholder="Article (désignation)…"
          onPick={pickArticle}
        />
        <input
          className="field__input course-addbar__qty"
          type="number"
          min="0"
          step="0.1"
          placeholder="Qté"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
        <input
          className="field__input course-addbar__unit"
          list="course-units"
          placeholder="Mesure"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
        />
        <datalist id="course-units">
          {COMMON_UNITS.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
        <button
          className="btn btn--primary"
          onClick={addItem}
          disabled={!draft.articleId && !draft.articleName}
        >
          Ajouter
        </button>
      </div>

      {importing && (
        <ImportRecipeModal
          listId={id}
          onClose={() => setImporting(false)}
          onDone={(updated) => {
            setImporting(false);
            setList(updated);
          }}
        />
      )}
    </div>
  );
}
