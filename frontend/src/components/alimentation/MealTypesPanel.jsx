import { useCallback, useEffect, useRef, useState } from 'react';
import { alimentationApi } from '../../api/alimentation';
import { MEAL_TYPE_ICONS } from './constants';
import { confirmDialog, promptDialog } from '../dialogs';

/**
 * Panneau de gestion des types de repas, intégré à la page Référentiel.
 * Créer / renommer / changer l'icône / réordonner / supprimer (RG-04/05).
 * Supprimer un type ne supprime aucune recette (réassignées « sans type »).
 */
export default function MealTypesPanel() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftIcon, setDraftIcon] = useState('🍽️');
  const [iconPickerFor, setIconPickerFor] = useState(null); // id | 'new' | null
  const dragRef = useRef(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setTypes(await alimentationApi.mealTypes());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run(fn) {
    setError('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  function create(e) {
    e?.preventDefault?.();
    if (!draftName.trim()) return;
    run(async () => {
      await alimentationApi.createMealType({
        name: draftName.trim(),
        icon: draftIcon,
      });
      setDraftName('');
      setDraftIcon('🍽️');
      setIconPickerFor(null);
    });
  }

  async function rename(type) {
    const next = await promptDialog({
      title: 'Renommer le type de repas',
      defaultValue: type.name,
    });
    if (next == null) return;
    const name = next.trim();
    if (!name || name === type.name) return;
    run(() => alimentationApi.updateMealType(type.id, { name }));
  }

  async function remove(type) {
    const n = type.recipeCount ?? 0;
    const msg =
      n > 0
        ? `Supprimer « ${type.name} » ? ${n} recette${n > 1 ? 's' : ''} repasseront « sans type ».`
        : `Supprimer « ${type.name} » ?`;
    if (!(await confirmDialog({ message: msg, danger: true }))) return;
    run(() => alimentationApi.removeMealType(type.id));
  }

  function handleDrop(targetId) {
    const fromId = dragRef.current;
    if (!fromId || fromId === targetId) return;
    const ids = types.map((t) => t.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    run(() => alimentationApi.reorderMealTypes(ids));
  }

  return (
    <div>
      <form className="ref-add" onSubmit={create}>
        <button
          type="button"
          className="rcatman__icon"
          onClick={() =>
            setIconPickerFor(iconPickerFor === 'new' ? null : 'new')
          }
          title="Icône"
        >
          {draftIcon}
        </button>
        <input
          className="field__input"
          value={draftName}
          placeholder="Ajouter un type de repas — ex : Goûter"
          maxLength={40}
          onChange={(e) => setDraftName(e.target.value)}
        />
        <button
          type="submit"
          className="btn btn--primary"
          disabled={!draftName.trim()}
        >
          Ajouter
        </button>
      </form>
      {iconPickerFor === 'new' && (
        <div className="rcatman__picker">
          {MEAL_TYPE_ICONS.map((ic) => (
            <button
              key={ic}
              type="button"
              onClick={() => {
                setDraftIcon(ic);
                setIconPickerFor(null);
              }}
            >
              {ic}
            </button>
          ))}
        </div>
      )}

      {error && <p className="modal__error">{error}</p>}

      {loading ? (
        <p className="ref-empty">Chargement…</p>
      ) : types.length === 0 ? (
        <p className="ref-empty">
          Aucun type de repas. Ajoutes-en un ci-dessus.
        </p>
      ) : (
        <ul className="ref-list">
          {types.map((type) => (
            <li
              key={type.id}
              className="ref-item"
              draggable
              onDragStart={() => (dragRef.current = type.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(type.id)}
            >
              <div className="refcat__lead">
                <span
                  className="reditrow__grip"
                  title="Glisser pour réordonner"
                >
                  ⠿
                </span>
                <button
                  type="button"
                  className="rcatman__icon"
                  onClick={() =>
                    setIconPickerFor(iconPickerFor === type.id ? null : type.id)
                  }
                  title="Changer l'icône"
                >
                  {type.icon || '🗂️'}
                </button>
                <span className="ref-item__name">{type.name}</span>
                <span className="rcatman__count">{type.recipeCount ?? 0}</span>
              </div>
              <div className="ref-item__actions">
                <button
                  className="icon-btn"
                  onClick={() => rename(type)}
                  aria-label="Renommer"
                  title="Renommer"
                >
                  ✏️
                </button>
                <button
                  className="icon-btn"
                  onClick={() => remove(type)}
                  aria-label="Supprimer"
                  title="Supprimer"
                >
                  🗑
                </button>
              </div>
              {iconPickerFor === type.id && (
                <div className="rcatman__picker rcatman__picker--row">
                  {MEAL_TYPE_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() =>
                        run(async () => {
                          await alimentationApi.updateMealType(type.id, {
                            icon: ic,
                          });
                          setIconPickerFor(null);
                        })
                      }
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
