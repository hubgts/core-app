import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { referentialApi } from '../api/referential';
import { confirmDialog, promptDialog } from '../components/dialogs';
import KnowHowCategoriesPanel from '../components/knowhow/KnowHowCategoriesPanel';
import MealTypesPanel from '../components/alimentation/MealTypesPanel';
import AislesPanel from '../components/course/AislesPanel';
import ArticlesPanel from '../components/course/ArticlesPanel';
import './ReferentialPage.css';

// Référentiels gérables. `custom` = panneau dédié (hors API référentiel générique).
const REFERENTIALS = [
  {
    kind: 'exercise',
    label: 'Exercices de musculation',
    icon: '🏋️',
    singular: 'exercice',
    placeholder: 'ex : Développé couché',
  },
  {
    kind: 'sport',
    label: 'Sports (paris)',
    icon: '🎰',
    singular: 'sport',
    placeholder: 'ex : MMA, Football',
  },
  {
    kind: 'knowhow_category',
    label: 'Catégories de savoir-faire',
    icon: '🛠️',
    custom: true,
  },
  {
    kind: 'meal_type',
    label: 'Types de repas',
    icon: '🍽️',
    custom: true,
  },
  {
    kind: 'course_article',
    label: 'Articles (course)',
    icon: '🛒',
    custom: true,
  },
  {
    kind: 'course_aisle',
    label: 'Rayons (course)',
    icon: '📦',
    custom: true,
  },
];

export default function ReferentialPage() {
  const [searchParams] = useSearchParams();
  const initialKind = REFERENTIALS.some((r) => r.kind === searchParams.get('kind'))
    ? searchParams.get('kind')
    : REFERENTIALS[0].kind;

  const [kind, setKind] = useState(initialKind);
  const ref = useMemo(() => REFERENTIALS.find((r) => r.kind === kind), [kind]);

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (ref?.custom) return; // panneau dédié : gère son propre chargement
    setError('');
    try {
      const rows = await referentialApi.list(kind, search);
      setItems(rows);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [kind, search, ref]);

  useEffect(() => {
    if (ref?.custom) return undefined;
    setLoading(true);
    const t = setTimeout(load, 150);
    return () => clearTimeout(t);
  }, [load, ref]);

  async function add(e) {
    e.preventDefault();
    const name = draft.trim();
    if (!name) return;
    setError('');
    try {
      await referentialApi.create(kind, name);
      setDraft('');
      setSearch('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function rename(item) {
    const next = await promptDialog({ title: 'Renommer', defaultValue: item.name });
    if (next == null) return;
    const name = next.trim();
    if (!name || name === item.name) return;
    setError('');
    try {
      await referentialApi.update(kind, item.id, name);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(item) {
    if (!(await confirmDialog({ message: `Supprimer « ${item.name} » du référentiel ?`, danger: true }))) return;
    setError('');
    try {
      await referentialApi.remove(kind, item.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="ref-page">
      <header className="page-head">
        <div>
          <h1 className="page-head__title">Référentiel</h1>
          <p className="page-head__subtitle">
            Gère les listes de valeurs réutilisées dans l'application.
          </p>
        </div>
      </header>

      <div className="ref-layout">
        <aside className="ref-cats">
          {REFERENTIALS.map((r) => (
            <button
              key={r.kind}
              className={`ref-cat${r.kind === kind ? ' is-active' : ''}`}
              onClick={() => {
                setKind(r.kind);
                setSearch('');
              }}
            >
              <span className="ref-cat__icon">{r.icon}</span>
              <span className="ref-cat__label">{r.label}</span>
            </button>
          ))}
        </aside>

        <section className="ref-panel">
          {ref?.custom ? (
            kind === 'meal_type' ? (
              <MealTypesPanel />
            ) : kind === 'course_article' ? (
              <ArticlesPanel />
            ) : kind === 'course_aisle' ? (
              <AislesPanel />
            ) : (
              <KnowHowCategoriesPanel />
            )
          ) : (
            <>
              <form className="ref-add" onSubmit={add}>
                <input
                  className="field__input"
                  value={draft}
                  placeholder={`Ajouter un ${ref.singular} — ${ref.placeholder}`}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button type="submit" className="btn btn--primary" disabled={!draft.trim()}>
                  Ajouter
                </button>
              </form>

              <input
                className="field__input ref-search"
                value={search}
                placeholder="Rechercher…"
                onChange={(e) => setSearch(e.target.value)}
              />

              {error && <p className="modal__error">{error}</p>}

              {loading ? (
                <p className="ref-empty">Chargement…</p>
              ) : items.length === 0 ? (
                <p className="ref-empty">
                  {search ? 'Aucun résultat.' : 'Aucun élément pour le moment.'}
                </p>
              ) : (
                <ul className="ref-list">
                  {items.map((item) => (
                    <li key={item.id} className="ref-item">
                      <span className="ref-item__name">{item.name}</span>
                      <div className="ref-item__actions">
                        <button
                          className="icon-btn"
                          onClick={() => rename(item)}
                          aria-label="Renommer"
                          title="Renommer"
                        >
                          ✏️
                        </button>
                        <button
                          className="icon-btn"
                          onClick={() => remove(item)}
                          aria-label="Supprimer"
                          title="Supprimer"
                        >
                          🗑
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
