import { useCallback, useEffect, useState } from 'react';
import { trainingApi } from '../api/training';
import { confirmDialog } from '../components/dialogs';
import { TYPE_META, TYPES } from '../components/training/constants';
import TemplateFormModal from '../components/training/TemplateFormModal';
import './TrainingPage.css';

const FILTERS = [{ id: '', label: 'Tous' }, ...TYPES.map((t) => ({ id: t, label: TYPE_META[t].label }))];

function summarize(tpl) {
  if (tpl.type === 'musculation') {
    const n = tpl.exercises?.length ?? 0;
    return n ? `${n} exercice${n > 1 ? 's' : ''}` : 'Musculation';
  }
  if (tpl.type === 'cardio') return tpl.zone ? `Cardio ${tpl.zone}` : 'Cardio';
  return tpl.title || 'Autre';
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { template? } | { presetType? }

  const load = useCallback(async () => {
    setError('');
    try {
      const rows = await trainingApi.templates(search, filter);
      setTemplates(rows);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(load, 150);
    return () => clearTimeout(t);
  }, [load]);

  async function handleSave(payload, id) {
    if (id) await trainingApi.updateTemplate(id, payload);
    else await trainingApi.createTemplate(payload);
    setModal(null);
    await load();
  }

  async function handleDelete(tpl) {
    if (!(await confirmDialog({ message: `Supprimer le template « ${tpl.name} » ?`, danger: true }))) return;
    await trainingApi.removeTemplate(tpl.id);
    setModal(null);
    await load();
  }

  return (
    <div className="training-page">
      <header className="page-head">
        <div>
          <h1 className="page-head__title">Templates d'entraînement</h1>
          <p className="page-head__subtitle">
            Des modèles de séance réutilisables pour remplir le formulaire en un clic.
          </p>
        </div>
        <button className="btn btn--primary" onClick={() => setModal({})}>+ Template</button>
      </header>

      <div className="control-bar">
        <div className="segmented" role="radiogroup" aria-label="Filtrer par type">
          {FILTERS.map((f) => (
            <button
              key={f.id || 'all'}
              role="radio"
              aria-checked={filter === f.id}
              className={`segmented__btn${filter === f.id ? ' is-active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          className="field__input tpl-search"
          placeholder="Rechercher un template…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="banner banner--error">{error}</p>}

      {loading ? (
        <p className="muted">Chargement…</p>
      ) : templates.length === 0 ? (
        <p className="muted">Aucun template. Crée ton premier modèle de séance.</p>
      ) : (
        <div className="tpl-grid">
          {templates.map((tpl) => {
            const meta = TYPE_META[tpl.type];
            return (
              <button
                key={tpl.id}
                type="button"
                className="tpl-card"
                style={{ '--c': meta.color }}
                onClick={() => setModal({ template: tpl })}
              >
                <div className="tpl-card__head">
                  <span className="tpl-card__icon">{meta.icon}</span>
                  <span className="tpl-card__name">{tpl.name}</span>
                </div>
                <span className="tpl-card__summary">{summarize(tpl)}</span>
                {tpl.tags.length > 0 && (
                  <div className="tpl-card__tags">
                    {tpl.tags.map((tag) => (
                      <span key={tag} className="tpl-tag">{tag}</span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {modal && (
        <TemplateFormModal
          template={modal.template}
          presetType={modal.presetType}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
