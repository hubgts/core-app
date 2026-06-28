import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { knowhowApi } from '../api/knowhow';
import { confirmDialog } from '../components/dialogs';
import KnowHowCard from '../components/knowhow/KnowHowCard';
import KnowHowFormModal from '../components/knowhow/KnowHowFormModal';
import KnowHowDrawer from '../components/knowhow/KnowHowDrawer';
import KebabMenu from '../components/KebabMenu';
import RealizationMode from '../components/knowhow/RealizationMode';
import { indexCategories, NO_CATEGORY } from '../components/knowhow/constants';
import './KnowHowPage.css';

// Normalisation pour la recherche : minuscule, sans accents.
const norm = (s) =>
  (s ?? '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function KnowHowPage() {
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [query, setQuery] = useState('');
  const [activeCats, setActiveCats] = useState(() => new Set());
  const [activeLabels, setActiveLabels] = useState(() => new Set());

  const [modal, setModal] = useState(null); // { recipe? } | null
  const [drawer, setDrawer] = useState(null); // savoir-faire | null
  const [realize, setRealize] = useState(null); // { recipe, scale } | null

  const dragRef = useRef(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const [recs, cats] = await Promise.all([
        knowhowApi.list(),
        knowhowApi.categories(),
      ]);
      setRecipes(recs);
      setCategories(cats);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  }

  const catOf = useMemo(() => indexCategories(categories), [categories]);

  const allLabels = useMemo(() => {
    const seen = new Map();
    for (const r of recipes)
      for (const l of r.labels)
        if (!seen.has(l.toLowerCase())) seen.set(l.toLowerCase(), l);
    return [...seen.values()].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [recipes]);

  const isFiltering =
    query.trim() !== '' || activeCats.size > 0 || activeLabels.size > 0;

  const filtered = useMemo(() => {
    const q = norm(query);
    return recipes.filter((r) => {
      if (activeCats.size > 0 && !activeCats.has(r.categoryId ?? '∅'))
        return false;
      if (
        activeLabels.size > 0 &&
        !r.labels.some((l) => activeLabels.has(l.toLowerCase()))
      )
        return false;
      if (q) {
        const hay = norm(
          [
            r.title,
            r.goal,
            r.labels.join(' '),
            r.components.map((c) => c.label).join(' '),
            r.steps.map((s) => s.text).join(' '),
          ].join(' '),
        );
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [recipes, query, activeCats, activeLabels]);

  const pinned = filtered.filter((r) => r.pinned);
  const others = filtered.filter((r) => !r.pinned);

  function toggleSet(setter, value) {
    setter((prev) => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  }

  function resetFilters() {
    setQuery('');
    setActiveCats(new Set());
    setActiveLabels(new Set());
  }

  // --- Détail ---
  async function openDetail(id) {
    try {
      const detail = await knowhowApi.get(id);
      setDrawer(detail);
    } catch (e) {
      flash(e.message);
    }
  }

  // --- Actions savoir-faire ---
  async function togglePin(recipe) {
    await (recipe.pinned
      ? knowhowApi.unpin(recipe.id)
      : knowhowApi.pin(recipe.id));
    await load();
  }
  async function setColor(recipe, color) {
    await knowhowApi.update(recipe.id, { color });
    await load();
  }
  async function duplicate(recipe) {
    await knowhowApi.duplicate(recipe.id);
    flash('Savoir-faire dupliqué.');
    await load();
  }
  async function archive(recipe) {
    await knowhowApi.archive(recipe.id);
    setModal(null);
    setDrawer(null);
    flash('Savoir-faire archivé.');
    await load();
  }
  async function deleteRecipe(recipe) {
    if (
      !(await confirmDialog({
        message: `Supprimer « ${recipe.title} » ? Cette action est irréversible.\n\nAstuce : « Archiver » conserve le savoir-faire.`,
        danger: true,
      }))
    )
      return;
    await knowhowApi.remove(recipe.id);
    setModal(null);
    setDrawer(null);
    flash('Savoir-faire supprimé.');
    await load();
  }
  async function saveRecipe(payload) {
    if (modal?.recipe) {
      await knowhowApi.update(modal.recipe.id, payload);
      flash('Savoir-faire mis à jour.');
    } else {
      await knowhowApi.create(payload);
      flash('Savoir-faire créé.');
    }
    setModal(null);
    await load();
  }

  // --- Réordonnancement des cartes (drag natif, désactivé si filtres actifs) ---
  function onCardDrop(targetId) {
    const fromId = dragRef.current;
    if (!fromId || fromId === targetId || isFiltering) return;
    const ids = recipes.map((r) => r.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    // Optimiste : réordonne localement puis persiste.
    const byId = new Map(recipes.map((r) => [r.id, r]));
    setRecipes(ids.map((id) => byId.get(id)));
    knowhowApi
      .reorder(ids)
      .then(load)
      .catch((e) => flash(e.message));
  }

  function renderCard(r) {
    return (
      <div
        key={r.id}
        className="rcard-wrap"
        draggable={!isFiltering}
        onDragStart={() => (dragRef.current = r.id)}
        onDragOver={(e) => !isFiltering && e.preventDefault()}
        onDrop={() => onCardDrop(r.id)}
      >
        <KnowHowCard
          recipe={r}
          category={catOf(r.categoryId)}
          onOpen={openDetail}
          onTogglePin={togglePin}
          onSetColor={setColor}
          onDuplicate={duplicate}
          onArchive={archive}
          onDelete={deleteRecipe}
        />
      </div>
    );
  }

  return (
    <div className="rpage">
      <header className="rpage__head">
        <h1 className="rpage__title">🛠️ Savoir-faire</h1>
        <div className="page__headactions">
          <button className="btn btn--primary" onClick={() => setModal({})}>
            + Savoir-faire
          </button>
          <KebabMenu
            actions={[
              {
                icon: '⚙',
                label: 'Gérer les catégories',
                to: '/referentiel?kind=knowhow_category',
              },
            ]}
          />
        </div>
      </header>

      {/* Barre de contrôle */}
      <div className="rcontrols">
        <input
          className="rsearch"
          type="search"
          value={query}
          placeholder="🔍 Rechercher (titre, composants, étapes, labels)…"
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="rfilters">
          {categories.map((c) => (
            <button
              key={c.id}
              className={`rfilter${activeCats.has(c.id) ? ' rfilter--on' : ''}`}
              style={{ '--c': c.color }}
              onClick={() => toggleSet(setActiveCats, c.id)}
            >
              {c.icon} {c.name}
            </button>
          ))}
          {recipes.some((r) => !r.categoryId) && (
            <button
              className={`rfilter${activeCats.has('∅') ? ' rfilter--on' : ''}`}
              onClick={() => toggleSet(setActiveCats, '∅')}
            >
              {NO_CATEGORY.icon} Sans catégorie
            </button>
          )}
        </div>
        {allLabels.length > 0 && (
          <div className="rfilters rfilters--labels">
            <span className="rfilters__lead">Labels :</span>
            {allLabels.map((l) => (
              <button
                key={l}
                className={`rchip rchip--filter${activeLabels.has(l.toLowerCase()) ? ' rchip--on' : ''}`}
                onClick={() => toggleSet(setActiveLabels, l.toLowerCase())}
              >
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="rpage__error">{error}</p>}
      {loading ? (
        <div className="rpage__loading">Chargement…</div>
      ) : recipes.length === 0 ? (
        <div className="rempty">
          <div className="rempty__icon">🛠️</div>
          <p>
            Capture ton premier savoir-faire : un plat, un produit maison, ou
            n'importe quel procédé à reproduire.
          </p>
          <button className="btn btn--primary" onClick={() => setModal({})}>
            + Savoir-faire
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rempty">
          <p>Aucun savoir-faire ne correspond à ta recherche.</p>
          <button className="btn btn--ghost" onClick={resetFilters}>
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <>
          {pinned.length > 0 && (
            <section className="rboard-section">
              <h2 className="rboard-section__title">📌 Épinglés</h2>
              <div className="rboard">{pinned.map(renderCard)}</div>
            </section>
          )}
          {others.length > 0 && (
            <section className="rboard-section">
              {pinned.length > 0 && (
                <h2 className="rboard-section__title">Autres</h2>
              )}
              <div className="rboard">{others.map(renderCard)}</div>
            </section>
          )}
        </>
      )}

      {modal && (
        <KnowHowFormModal
          recipe={modal.recipe}
          categories={categories}
          onSave={saveRecipe}
          onArchive={archive}
          onDelete={deleteRecipe}
          onClose={() => setModal(null)}
        />
      )}

      {drawer && (
        <KnowHowDrawer
          recipe={drawer}
          category={catOf(drawer.categoryId)}
          onRealize={(recipe, scale = 1) => setRealize({ recipe, scale })}
          onEdit={(recipe) => {
            setDrawer(null);
            setModal({ recipe });
          }}
          onDuplicate={duplicate}
          onArchive={archive}
          onDelete={deleteRecipe}
          onClose={() => setDrawer(null)}
        />
      )}

      {realize && (
        <RealizationMode
          recipe={realize.recipe}
          scale={realize.scale}
          onClose={() => setRealize(null)}
        />
      )}

      {toast && <div className="rtoast">{toast}</div>}
    </div>
  );
}
