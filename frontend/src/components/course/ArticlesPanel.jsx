import { useCallback, useEffect, useState } from 'react';
import { courseApi } from '../../api/course';
import { COMMON_UNITS } from './constants';
import { confirmDialog, promptDialog } from '../dialogs';
import Combobox from '../Combobox';

/**
 * Panneau de gestion du référentiel d'articles, intégré à la page Référentiel.
 * Chaque article : nom (titre) + mesure (unité par défaut) + rayon par défaut.
 * Créer / renommer / changer la mesure ou le rayon / supprimer (refus si utilisé).
 */
export default function ArticlesPanel() {
  const [articles, setArticles] = useState([]);
  const [aisles, setAisles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [aisleId, setAisleId] = useState('');

  const aisleName = (id) => aisles.find((a) => a.id === id)?.name ?? 'Autre';

  const load = useCallback(async () => {
    setError('');
    try {
      const [arts, ais] = await Promise.all([
        courseApi.articles(search),
        courseApi.aisles(),
      ]);
      setArticles(arts);
      setAisles(ais);
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
    e.preventDefault();
    if (!name.trim()) return;
    run(async () => {
      await courseApi.createArticle({
        name: name.trim(),
        unit: unit || null,
        aisleId: aisleId || null,
      });
      setName('');
      setUnit('');
      setAisleId('');
      setSearch('');
    });
  }

  async function rename(a) {
    const next = await promptDialog({ title: "Renommer l'article", defaultValue: a.name });
    if (next == null || !next.trim() || next.trim() === a.name) return;
    run(() => courseApi.updateArticle(a.id, { name: next.trim() }));
  }

  async function changeUnit(a) {
    const next = await promptDialog({
      title: 'Mesure par défaut',
      message: 'g, kg, L, unité…',
      defaultValue: a.unit || '',
    });
    if (next == null) return;
    run(() => courseApi.updateArticle(a.id, { unit: next.trim() }));
  }

  async function changeAisle(a) {
    const choices = aisles.map((x, i) => `${i + 1}. ${x.name}`).join('\n');
    const pick = await promptDialog({
      title: `Rayon de « ${a.name} »`,
      message: `${choices}\n(vide = Autre)`,
      placeholder: 'Numéro du rayon',
    });
    if (pick == null) return;
    if (pick.trim() === '') {
      run(() => courseApi.updateArticle(a.id, { aisleId: null }));
      return;
    }
    const idx = Number(pick) - 1;
    if (!Number.isInteger(idx) || idx < 0 || idx >= aisles.length) return;
    run(() => courseApi.updateArticle(a.id, { aisleId: aisles[idx].id }));
  }

  async function remove(a) {
    if (!(await confirmDialog({ message: `Supprimer l'article « ${a.name} » du référentiel ?`, danger: true }))) return;
    run(() => courseApi.removeArticle(a.id));
  }

  return (
    <div>
      <form className="artman__add" onSubmit={create}>
        <input
          className="field__input"
          value={name}
          placeholder="Nom de l'article — ex : Yaourt grec"
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="field__input"
          list="artman-units"
          value={unit}
          placeholder="Mesure"
          style={{ width: 110, flex: '0 0 auto' }}
          onChange={(e) => setUnit(e.target.value)}
        />
        <datalist id="artman-units">
          {COMMON_UNITS.map((u) => <option key={u} value={u} />)}
        </datalist>
        <Combobox
          className="field__input"
          block={false}
          value={aisleId}
          onChange={setAisleId}
          options={[
            { value: '', label: 'Rayon : Autre' },
            ...aisles.map((a) => ({ value: a.id, label: a.name })),
          ]}
        />
        <button type="submit" className="btn btn--primary" disabled={!name.trim()}>Ajouter</button>
      </form>

      <input
        className="field__input ref-search"
        value={search}
        placeholder="Rechercher un article…"
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && <p className="modal__error">{error}</p>}

      {loading ? (
        <p className="ref-empty">Chargement…</p>
      ) : articles.length === 0 ? (
        <p className="ref-empty">{search ? 'Aucun résultat.' : 'Aucun article pour le moment.'}</p>
      ) : (
        <ul className="ref-list">
          {articles.map((a) => (
            <li key={a.id} className="ref-item">
              <div className="artman__row">
                <span className="ref-item__name">{a.name}</span>
                <button className="artman__unit" onClick={() => changeUnit(a)} title="Changer la mesure">
                  {a.unit || 'sans mesure'}
                </button>
                <button className="artman__aisle" onClick={() => changeAisle(a)} title="Changer le rayon">
                  · {aisleName(a.aisleId)}
                </button>
              </div>
              <div className="ref-item__actions">
                <button className="icon-btn" onClick={() => rename(a)} aria-label="Renommer" title="Renommer">✏️</button>
                <button className="icon-btn" onClick={() => remove(a)} aria-label="Supprimer" title="Supprimer">🗑</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
