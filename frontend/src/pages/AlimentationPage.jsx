import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { alimentationApi } from '../api/alimentation';
import { confirmDialog } from '../components/dialogs';
import RecipeCard from '../components/alimentation/RecipeCard';
import RecipeFormModal from '../components/alimentation/RecipeFormModal';
import RecipeDrawer from '../components/alimentation/RecipeDrawer';
import CookMode from '../components/alimentation/CookMode';
import KebabMenu from '../components/KebabMenu';
import {
  indexMealTypes,
  NO_MEAL_TYPE,
} from '../components/alimentation/constants';
import './AlimentationPage.css';

// Normalisation pour la recherche : minuscule, sans accents.
const norm = (s) =>
  (s ?? '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function AlimentationPage() {
  const [recipes, setRecipes] = useState([]);
  const [mealTypes, setMealTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [query, setQuery] = useState('');
  const [activeTypes, setActiveTypes] = useState(() => new Set());
  const [activeLabels, setActiveLabels] = useState(() => new Set());

  const [modal, setModal] = useState(null); // { recipe? } | null
  const [drawer, setDrawer] = useState(null); // recette | null
  const [cook, setCook] = useState(null); // { recipe, scale } | null

  const dragRef = useRef(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const [recs, types] = await Promise.all([
        alimentationApi.list(),
        alimentationApi.mealTypes(),
      ]);
      setRecipes(recs);
      setMealTypes(types);
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

  const typeOf = useMemo(() => indexMealTypes(mealTypes), [mealTypes]);

  const allLabels = useMemo(() => {
    const seen = new Map();
    for (const r of recipes)
      for (const l of r.labels)
        if (!seen.has(l.toLowerCase())) seen.set(l.toLowerCase(), l);
    return [...seen.values()].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [recipes]);

  const isFiltering =
    query.trim() !== '' || activeTypes.size > 0 || activeLabels.size > 0;

  const filtered = useMemo(() => {
    const q = norm(query);
    return recipes.filter((r) => {
      if (activeTypes.size > 0 && !activeTypes.has(r.mealTypeId ?? '∅'))
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
            r.description,
            r.labels.join(' '),
            r.ingredients.map((i) => i.label).join(' '),
            r.steps.map((s) => s.text).join(' '),
          ].join(' '),
        );
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [recipes, query, activeTypes, activeLabels]);

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
    setActiveTypes(new Set());
    setActiveLabels(new Set());
  }

  // --- Détail ---
  async function openDetail(id) {
    try {
      const detail = await alimentationApi.get(id);
      setDrawer(detail);
    } catch (e) {
      flash(e.message);
    }
  }

  // --- Actions recette ---
  async function togglePin(recipe) {
    await (recipe.pinned
      ? alimentationApi.unpin(recipe.id)
      : alimentationApi.pin(recipe.id));
    await load();
  }
  async function setColor(recipe, color) {
    await alimentationApi.update(recipe.id, { color });
    await load();
  }
  async function duplicate(recipe) {
    await alimentationApi.duplicate(recipe.id);
    flash('Recette dupliquée.');
    await load();
  }
  async function archive(recipe) {
    await alimentationApi.archive(recipe.id);
    setModal(null);
    setDrawer(null);
    flash('Recette archivée.');
    await load();
  }
  async function deleteRecipe(recipe) {
    if (
      !(await confirmDialog({
        message: `Supprimer « ${recipe.title} » ? Cette action est irréversible.\n\nAstuce : « Archiver » conserve la recette.`,
        danger: true,
      }))
    )
      return;
    await alimentationApi.remove(recipe.id);
    setModal(null);
    setDrawer(null);
    flash('Recette supprimée.');
    await load();
  }
  async function saveRecipe(payload) {
    if (modal?.recipe) {
      await alimentationApi.update(modal.recipe.id, payload);
      flash('Recette mise à jour.');
    } else {
      await alimentationApi.create(payload);
      flash('Recette créée.');
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
    alimentationApi
      .reorder(ids)
      .then(load)
      .catch((e) => flash(e.message));
  }

  function renderCard(r) {
    return (
      <div
        key={r.id}
        className="alcard-wrap"
        draggable={!isFiltering}
        onDragStart={() => (dragRef.current = r.id)}
        onDragOver={(e) => !isFiltering && e.preventDefault()}
        onDrop={() => onCardDrop(r.id)}
      >
        <RecipeCard
          recipe={r}
          mealType={typeOf(r.mealTypeId)}
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
    <div className="alpage">
      <header className="alpage__head">
        <h1 className="alpage__title">🍽️ Alimentation</h1>
        <div className="page__headactions">
          <button className="btn btn--primary" onClick={() => setModal({})}>
            + Recette
          </button>
          <KebabMenu
            actions={[
              {
                icon: '⚙',
                label: 'Gérer les types de repas',
                to: '/referentiel?kind=meal_type',
              },
            ]}
          />
        </div>
      </header>

      {/* Barre de contrôle */}
      <div className="alcontrols">
        <input
          className="alsearch"
          type="search"
          value={query}
          placeholder="🔍 Rechercher (titre, ingrédients, étapes, labels)…"
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="alfilters">
          {mealTypes.map((t) => (
            <button
              key={t.id}
              className={`alfilter${activeTypes.has(t.id) ? ' alfilter--on' : ''}`}
              style={{ '--c': t.color }}
              onClick={() => toggleSet(setActiveTypes, t.id)}
            >
              {t.icon} {t.name}
            </button>
          ))}
          {recipes.some((r) => !r.mealTypeId) && (
            <button
              className={`alfilter${activeTypes.has('∅') ? ' alfilter--on' : ''}`}
              onClick={() => toggleSet(setActiveTypes, '∅')}
            >
              {NO_MEAL_TYPE.icon} Sans type
            </button>
          )}
        </div>
        {allLabels.length > 0 && (
          <div className="alfilters alfilters--labels">
            <span className="alfilters__lead">Labels :</span>
            {allLabels.map((l) => (
              <button
                key={l}
                className={`alchip alchip--filter${activeLabels.has(l.toLowerCase()) ? ' alchip--on' : ''}`}
                onClick={() => toggleSet(setActiveLabels, l.toLowerCase())}
              >
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="alpage__error">{error}</p>}
      {loading ? (
        <div className="alpage__loading">Chargement…</div>
      ) : recipes.length === 0 ? (
        <div className="alempty">
          <div className="alempty__icon">🍽️</div>
          <p>Ajoute ta première recette : un plat, un dessert, une sauce…</p>
          <button className="btn btn--primary" onClick={() => setModal({})}>
            + Recette
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="alempty">
          <p>Aucune recette ne correspond à ta recherche.</p>
          <button className="btn btn--ghost" onClick={resetFilters}>
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <>
          {pinned.length > 0 && (
            <section className="alboard-section">
              <h2 className="alboard-section__title">📌 Épinglées</h2>
              <div className="alboard">{pinned.map(renderCard)}</div>
            </section>
          )}
          {others.length > 0 && (
            <section className="alboard-section">
              {pinned.length > 0 && (
                <h2 className="alboard-section__title">Autres</h2>
              )}
              <div className="alboard">{others.map(renderCard)}</div>
            </section>
          )}
        </>
      )}

      {modal && (
        <RecipeFormModal
          recipe={modal.recipe}
          mealTypes={mealTypes}
          onSave={saveRecipe}
          onArchive={archive}
          onDelete={deleteRecipe}
          onClose={() => setModal(null)}
        />
      )}

      {drawer && (
        <RecipeDrawer
          recipe={drawer}
          mealType={typeOf(drawer.mealTypeId)}
          onCook={(recipe, scale = 1) => setCook({ recipe, scale })}
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

      {cook && (
        <CookMode
          recipe={cook.recipe}
          scale={cook.scale}
          onClose={() => setCook(null)}
        />
      )}

      {toast && <div className="altoast">{toast}</div>}
    </div>
  );
}
