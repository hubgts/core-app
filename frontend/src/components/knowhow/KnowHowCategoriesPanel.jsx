import { useCallback, useEffect, useRef, useState } from 'react';
import { knowhowApi } from '../../api/knowhow';
import { CATEGORY_ICONS } from './constants';
import { confirmDialog, promptDialog } from '../dialogs';

/**
 * Panneau de gestion des catégories de savoir-faire, intégré à la page Référentiel.
 * Créer / renommer / changer l'icône / réordonner / supprimer (RG-04/05).
 * Supprimer une catégorie ne supprime aucun savoir-faire (réassignées « sans catégorie »).
 */
export default function KnowHowCategoriesPanel() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftIcon, setDraftIcon] = useState('📋');
  const [iconPickerFor, setIconPickerFor] = useState(null); // id | 'new' | null
  const dragRef = useRef(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setCategories(await knowhowApi.categories());
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
      await knowhowApi.createCategory({
        name: draftName.trim(),
        icon: draftIcon,
      });
      setDraftName('');
      setDraftIcon('📋');
      setIconPickerFor(null);
    });
  }

  async function rename(cat) {
    const next = await promptDialog({
      title: 'Renommer la catégorie',
      defaultValue: cat.name,
    });
    if (next == null) return;
    const name = next.trim();
    if (!name || name === cat.name) return;
    run(() => knowhowApi.updateCategory(cat.id, { name }));
  }

  async function remove(cat) {
    const n = cat.knowhowCount ?? 0;
    const msg =
      n > 0
        ? `Supprimer « ${cat.name} » ? ${n} savoir-faire repasseront « sans catégorie ».`
        : `Supprimer « ${cat.name} » ?`;
    if (!(await confirmDialog({ message: msg, danger: true }))) return;
    run(() => knowhowApi.removeCategory(cat.id));
  }

  function handleDrop(targetId) {
    const fromId = dragRef.current;
    if (!fromId || fromId === targetId) return;
    const ids = categories.map((c) => c.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    run(() => knowhowApi.reorderCategories(ids));
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
          placeholder="Ajouter une catégorie — ex : Pâtisserie"
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
          {CATEGORY_ICONS.map((ic) => (
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
      ) : categories.length === 0 ? (
        <p className="ref-empty">Aucune catégorie. Ajoute-en une ci-dessus.</p>
      ) : (
        <ul className="ref-list">
          {categories.map((cat) => (
            <li
              key={cat.id}
              className="ref-item"
              draggable
              onDragStart={() => (dragRef.current = cat.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(cat.id)}
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
                    setIconPickerFor(iconPickerFor === cat.id ? null : cat.id)
                  }
                  title="Changer l'icône"
                >
                  {cat.icon || '🗂️'}
                </button>
                <span className="ref-item__name">{cat.name}</span>
                <span className="rcatman__count">{cat.knowhowCount ?? 0}</span>
              </div>
              <div className="ref-item__actions">
                <button
                  className="icon-btn"
                  onClick={() => rename(cat)}
                  aria-label="Renommer"
                  title="Renommer"
                >
                  ✏️
                </button>
                <button
                  className="icon-btn"
                  onClick={() => remove(cat)}
                  aria-label="Supprimer"
                  title="Supprimer"
                >
                  🗑
                </button>
              </div>
              {iconPickerFor === cat.id && (
                <div className="rcatman__picker rcatman__picker--row">
                  {CATEGORY_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() =>
                        run(async () => {
                          await knowhowApi.updateCategory(cat.id, { icon: ic });
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
