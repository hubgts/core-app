import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseApi } from '../api/course';
import { confirmDialog, promptDialog } from '../components/dialogs';
import ListCard from '../components/course/ListCard';
import CourseListFormModal from '../components/course/CourseListFormModal';
import ImportRecipeModal from '../components/course/ImportRecipeModal';
import TemplatePickerModal from '../components/course/TemplatePickerModal';
import KebabMenu from '../components/KebabMenu';
import '../pages/AlimentationPage.css';
import './CoursePage.css';
import { toast } from '../components/toast';

const norm = (s) =>
  (s ?? '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function CoursePage() {
  const navigate = useNavigate();
  const [lists, setLists] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState(null); // { list? } | null
  const [importing, setImporting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const dragRef = useRef(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const [allLists, tpls] = await Promise.all([
        courseApi.lists(),
        courseApi.templates(),
      ]);
      setLists(allLists);
      setTemplates(tpls);
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

  const isFiltering = query.trim() !== '';
  const filtered = lists.filter(
    (l) => !isFiltering || norm(l.title).includes(norm(query)),
  );

  // --- Création / édition via modale ---
  async function saveList(payload, id) {
    if (id) {
      await courseApi.updateList(id, payload);
      setModal(null);
      toast('Liste mise à jour.');
      await load();
    } else {
      const created = await courseApi.createList(payload);
      setModal(null);
      navigate(`/course/${created.id}`);
    }
  }

  function duplicate(list) {
    run(async () => {
      await courseApi.duplicateList(list.id);
      toast('Liste dupliquée.');
    });
  }

  async function removeList(list) {
    if (
      !(await confirmDialog({
        message: `Supprimer « ${list.title} » ? Action irréversible.`,
        danger: true,
      }))
    )
      return;
    run(async () => {
      await courseApi.removeList(list.id);
      toast('Liste supprimée.');
    });
  }

  async function newTemplate() {
    const title = await promptDialog({
      title: 'Nom du modèle',
      defaultValue: 'Essentiels',
    });
    if (title == null || !title.trim()) return;
    run(() => courseApi.createTemplate({ title: title.trim() }));
  }

  async function removeTemplate(t) {
    if (
      !(await confirmDialog({
        message: `Supprimer le modèle « ${t.title} » ?`,
        danger: true,
      }))
    )
      return;
    run(() => courseApi.removeTemplate(t.id));
  }

  // --- Réordonnancement des cartes (drag natif, désactivé si recherche active) ---
  function onCardDrop(targetId) {
    const fromId = dragRef.current;
    if (!fromId || fromId === targetId || isFiltering) return;
    const ids = lists.map((l) => l.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    const byId = new Map(lists.map((l) => [l.id, l]));
    setLists(ids.map((id) => byId.get(id)));
    courseApi
      .reorderLists(ids)
      .then(load)
      .catch((e) => toast(e.message));
  }

  return (
    <div className="alpage">
      <header className="alpage__head">
        <h1 className="alpage__title">🛒 Course</h1>
        <div className="page__headactions">
          <div className="course-create">
            <button
              className="btn btn--primary"
              onClick={() => setMenuOpen((v) => !v)}
            >
              + Liste ▾
            </button>
            {menuOpen && (
              <div
                className="course-create__menu"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setModal({});
                  }}
                >
                  Liste vide
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setImporting(true);
                  }}
                >
                  À partir d'une recette…
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setPicking(true);
                  }}
                  disabled={templates.length === 0}
                  title={
                    templates.length === 0 ? 'Aucun modèle disponible' : ''
                  }
                >
                  Créer à partir d'un modèle…
                </button>
              </div>
            )}
          </div>
          <KebabMenu
            actions={[
              {
                icon: '⚙',
                label: 'Gérer les articles',
                to: '/referentiel?kind=course_article',
              },
              {
                icon: '⚙',
                label: 'Gérer les rayons',
                to: '/referentiel?kind=course_aisle',
              },
            ]}
          />
        </div>
      </header>

      <div className="alcontrols">
        <input
          className="alsearch"
          type="search"
          value={query}
          placeholder="🔍 Rechercher une liste…"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && <p className="alpage__error">{error}</p>}

      {loading ? (
        <div className="alpage__loading">Chargement…</div>
      ) : (
        <>
          <section className="alboard-section">
            {lists.length === 0 ? (
              <div className="alempty">
                <div className="alempty__icon">🛒</div>
                <p>Crée ta première liste : vide, ou à partir d'une recette.</p>
                <button
                  className="btn btn--primary"
                  onClick={() => setModal({})}
                >
                  + Liste
                </button>
              </div>
            ) : (
              <>
                <div className="alboard">
                  {filtered.map((l) => (
                    <div
                      key={l.id}
                      className="alcard-wrap"
                      draggable={!isFiltering}
                      onDragStart={() => (dragRef.current = l.id)}
                      onDragOver={(e) => !isFiltering && e.preventDefault()}
                      onDrop={() => onCardDrop(l.id)}
                    >
                      <ListCard
                        list={l}
                        onOpen={(id) => navigate(`/course/${id}`)}
                        onEdit={(list) => setModal({ list })}
                        onDuplicate={duplicate}
                        onDelete={removeList}
                      />
                    </div>
                  ))}
                </div>
                {filtered.length === 0 && (
                  <p className="course-empty">
                    Aucune liste ne correspond à ta recherche.
                  </p>
                )}
              </>
            )}
          </section>

          <section className="alboard-section">
            <h2 className="alboard-section__title">📋 Modèles</h2>
            <div className="course-grid">
              {templates.map((t) => (
                <div key={t.id} className="course-card course-card--template">
                  <div className="course-card__head">
                    <span className="course-card__icon">📋</span>
                    <span className="course-card__title">{t.title}</span>
                  </div>
                  <p className="course-card__meta">
                    {t.itemCount} article{t.itemCount > 1 ? 's' : ''}
                  </p>
                  <div className="course-card__actions">
                    <button
                      className="btn btn--sm btn--primary"
                      onClick={() => navigate(`/course/template/${t.id}`)}
                    >
                      Modifier
                    </button>
                    <button
                      className="btn btn--sm btn--ghost"
                      onClick={() => removeTemplate(t)}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
              <button
                className="course-card course-card--add"
                onClick={newTemplate}
              >
                + Nouveau modèle
              </button>
            </div>
          </section>
        </>
      )}

      {modal && (
        <CourseListFormModal
          list={modal.list}
          onSave={saveList}
          onDelete={removeList}
          onClose={() => setModal(null)}
        />
      )}

      {importing && (
        <ImportRecipeModal
          onClose={() => setImporting(false)}
          onDone={(list) => {
            setImporting(false);
            navigate(`/course/${list.id}`);
          }}
        />
      )}

      {picking && (
        <TemplatePickerModal
          templates={templates}
          onClose={() => setPicking(false)}
          onConfirm={async (templateId) => {
            const created = await courseApi.instantiateTemplate(templateId, {});
            setPicking(false);
            navigate(`/course/${created.id}`);
          }}
        />
      )}
    </div>
  );
}
