import { useCallback, useEffect, useState } from 'react';
import { alimentationApi } from '../api/alimentation';
import { confirmDialog } from '../components/dialogs';
import FoodFormModal from '../components/alimentation/FoodFormModal';
import EmptyState from '../components/EmptyState';
import './FoodsPage.css';

/**
 * Référentiel des aliments : macronutriments (glucides / protéines / lipides)
 * et calories pour 100 g/ml. Les aliments alimentent la liste stricte des
 * ingrédients de recette (calcul nutritionnel). Dissocié du module Course.
 */
export default function FoodsPage() {
  const [foods, setFoods] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // { food? } | null

  const load = useCallback(async () => {
    setError('');
    try {
      setFoods(await alimentationApi.foods(search));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(load, 150);
    return () => clearTimeout(t);
  }, [load]);

  async function save(data) {
    if (modal?.food) {
      await alimentationApi.updateFood(modal.food.id, data);
    } else {
      await alimentationApi.createFood(data);
    }
    setModal(null);
    await load();
  }

  async function remove(food) {
    if (
      !(await confirmDialog({
        message: `Supprimer l'aliment « ${food.name} » ?`,
        danger: true,
      }))
    )
      return;
    try {
      await alimentationApi.removeFood(food.id);
      setModal(null);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="foodspage">
      <header className="page-head">
        <div>
          <h1 className="page-head__title">🥑 Aliments</h1>
          <p className="page-head__subtitle">
            Macronutriments et calories pour 100 g/ml. Sert de base de calcul
            aux recettes.
          </p>
        </div>
        <div className="page__headactions">
          <button className="btn btn--primary" onClick={() => setModal({})}>
            + Aliment
          </button>
        </div>
      </header>

      <input
        className="alsearch foodspage__search"
        type="search"
        value={search}
        placeholder="🔍 Rechercher un aliment…"
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && <p className="modal__error">{error}</p>}

      {loading ? (
        <p className="ref-empty">Chargement…</p>
      ) : foods.length === 0 ? (
        search ? (
          <EmptyState>Aucun aliment ne correspond.</EmptyState>
        ) : (
          <EmptyState
            icon="🥑"
            action={
              <button className="btn btn--primary" onClick={() => setModal({})}>
                + Aliment
              </button>
            }
          >
            Aucun aliment. Ajoutes-en un pour commencer.
          </EmptyState>
        )
      ) : (
        <div className="foodtable">
          <div className="foodtable__head">
            <span>Aliment</span>
            <span>Glucides</span>
            <span>Protéines</span>
            <span>Lipides</span>
            <span>Calories</span>
          </div>
          {foods.map((f) => (
            <button
              key={f.id}
              className="foodtable__row"
              onClick={() => setModal({ food: f })}
            >
              <span className="foodtable__name">
                {f.name}
                <span className="foodtable__base">/ 100 {f.unit}</span>
              </span>
              <span>{f.carbs} g</span>
              <span>{f.protein} g</span>
              <span>{f.fat} g</span>
              <span className="foodtable__kcal">{f.kcal} kcal</span>
            </button>
          ))}
        </div>
      )}

      {modal && (
        <FoodFormModal
          food={modal.food}
          onSave={save}
          onDelete={remove}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
