import { useCallback, useEffect, useRef, useState } from 'react';
import { courseApi } from '../../api/course';
import { AISLE_ICONS } from './constants';
import { confirmDialog, promptDialog } from '../dialogs';

/**
 * Panneau de gestion des rayons, intégré à la page Référentiel.
 * Créer / renommer / changer l'icône / réordonner (= parcours magasin) /
 * supprimer (RG-04/05). Supprimer un rayon → ses articles repassent « Autre ».
 */
export default function AislesPanel() {
  const [aisles, setAisles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftIcon, setDraftIcon] = useState('📦');
  const [iconPickerFor, setIconPickerFor] = useState(null);
  const dragRef = useRef(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setAisles(await courseApi.aisles());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
      await courseApi.createAisle({ name: draftName.trim(), icon: draftIcon });
      setDraftName('');
      setDraftIcon('📦');
      setIconPickerFor(null);
    });
  }

  async function rename(a) {
    const next = await promptDialog({ title: 'Renommer le rayon', defaultValue: a.name });
    if (next == null || !next.trim() || next.trim() === a.name) return;
    run(() => courseApi.updateAisle(a.id, { name: next.trim() }));
  }

  async function remove(a) {
    const n = a.articleCount ?? 0;
    const msg = n > 0
      ? `Supprimer « ${a.name} » ? ${n} article${n > 1 ? 's' : ''} repasseront « Autre ».`
      : `Supprimer « ${a.name} » ?`;
    if (!(await confirmDialog({ message: msg, danger: true }))) return;
    run(() => courseApi.removeAisle(a.id));
  }

  function handleDrop(targetId) {
    const fromId = dragRef.current;
    if (!fromId || fromId === targetId) return;
    const ids = aisles.map((a) => a.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    run(() => courseApi.reorderAisles(ids));
  }

  return (
    <div>
      <p className="course-import__lead">L'ordre des rayons = ton parcours en magasin.</p>
      <form className="ref-add" onSubmit={create}>
        <button
          type="button"
          className="rcatman__icon"
          onClick={() => setIconPickerFor(iconPickerFor === 'new' ? null : 'new')}
          title="Icône"
        >
          {draftIcon}
        </button>
        <input
          className="field__input"
          value={draftName}
          placeholder="Ajouter un rayon — ex : Bio"
          maxLength={40}
          onChange={(e) => setDraftName(e.target.value)}
        />
        <button type="submit" className="btn btn--primary" disabled={!draftName.trim()}>Ajouter</button>
      </form>
      {iconPickerFor === 'new' && (
        <div className="rcatman__picker">
          {AISLE_ICONS.map((ic) => (
            <button key={ic} type="button" onClick={() => { setDraftIcon(ic); setIconPickerFor(null); }}>{ic}</button>
          ))}
        </div>
      )}

      {error && <p className="modal__error">{error}</p>}

      {loading ? (
        <p className="ref-empty">Chargement…</p>
      ) : (
        <ul className="ref-list">
          {aisles.map((a) => (
            <li
              key={a.id}
              className="ref-item"
              draggable
              onDragStart={() => (dragRef.current = a.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(a.id)}
            >
              <div className="refcat__lead">
                <span className="reditrow__grip" title="Glisser pour réordonner">⠿</span>
                <button
                  type="button"
                  className="rcatman__icon"
                  onClick={() => setIconPickerFor(iconPickerFor === a.id ? null : a.id)}
                  title="Changer l'icône"
                >
                  {a.icon || '📦'}
                </button>
                <span className="ref-item__name">{a.name}</span>
                <span className="rcatman__count">{a.articleCount ?? 0}</span>
              </div>
              <div className="ref-item__actions">
                <button className="icon-btn" onClick={() => rename(a)} aria-label="Renommer" title="Renommer">✏️</button>
                <button className="icon-btn" onClick={() => remove(a)} aria-label="Supprimer" title="Supprimer">🗑</button>
              </div>
              {iconPickerFor === a.id && (
                <div className="rcatman__picker rcatman__picker--row">
                  {AISLE_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => run(async () => {
                        await courseApi.updateAisle(a.id, { icon: ic });
                        setIconPickerFor(null);
                      })}
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
