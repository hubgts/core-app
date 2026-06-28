import { useCallback, useEffect, useState } from 'react';
import { trainingApi } from '../api/training';
import { confirmDialog } from '../components/dialogs';
import KebabMenu from '../components/KebabMenu';
import ProgramEditor from '../components/training/ProgramEditor';
import StartProgramModal from '../components/training/StartProgramModal';
import './TrainingPage.css';
import './ProgramsPage.css';

export default function ProgramsPage() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | { program? }  (objet = mode édition)
  const [starting, setStarting] = useState(null); // programme à démarrer
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setPrograms(await trainingApi.programs());
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
    window.clearTimeout(flash._t);
    flash._t = window.setTimeout(() => setToast(''), 3200);
  }

  async function openEdit(p) {
    // Charge le détail complet (phases / semaines / séances) avant édition.
    const full = await trainingApi.program(p.id);
    setEditing({ program: full });
  }

  async function handleDelete(p) {
    if (
      !(await confirmDialog({
        message: `Supprimer le programme « ${p.name} » ? (les séances déjà placées ne sont pas touchées)`,
        danger: true,
      }))
    )
      return;
    await trainingApi.removeProgram(p.id);
    await load();
    flash('Programme supprimé.');
  }

  // --- Mode édition ---
  if (editing) {
    return (
      <div className="training-page">
        <ProgramEditor
          program={editing.program}
          onCancel={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
            flash('Programme enregistré.');
          }}
        />
        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  // --- Liste ---
  return (
    <div className="training-page">
      <header className="page-head">
        <div>
          <h1 className="page-head__title">Programmes</h1>
          <p className="page-head__subtitle">
            Construis des cycles (phases, semaines, deload) et déroule-les dans
            ton planning.
          </p>
        </div>
        <div className="page__headactions">
          <button className="btn btn--primary" onClick={() => setEditing({})}>
            + Programme
          </button>
        </div>
      </header>

      {error && <p className="banner banner--error">{error}</p>}

      {loading ? (
        <p className="muted">Chargement…</p>
      ) : programs.length === 0 ? (
        <div className="prog-empty">
          <span className="prog-empty__icon">🗓</span>
          <h2 className="prog-empty__title">Crée ton premier programme</h2>
          <p className="muted">
            Un programme ordonne des séances dans le temps : phases, semaines
            S1…Sn, et un démarrage à la date de ton choix qui remplit le
            planning.
          </p>
          <button className="btn btn--primary" onClick={() => setEditing({})}>
            + Programme
          </button>
        </div>
      ) : (
        <div className="prog-grid">
          {programs.map((p) => (
            <div key={p.id} className="prog-card">
              <button
                type="button"
                className="prog-card__main"
                onClick={() => openEdit(p)}
              >
                <div className="prog-card__head">
                  <span className="prog-card__icon">🗓</span>
                  <span className="prog-card__name">{p.name}</span>
                </div>
                <span className="prog-card__meta">
                  {p.phaseCount} phase{p.phaseCount > 1 ? 's' : ''} ·{' '}
                  {p.weekCount} semaine
                  {p.weekCount > 1 ? 's' : ''} · {p.sessionCount} séance
                  {p.sessionCount > 1 ? 's' : ''}
                </span>
                {p.phaseObjectives.length > 0 && (
                  <span className="prog-card__phases">
                    {p.phaseObjectives.join(' › ')}
                  </span>
                )}
              </button>
              <div className="prog-card__actions">
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => setStarting(p)}
                >
                  Démarrer
                </button>
                <KebabMenu
                  label={`Actions pour ${p.name}`}
                  actions={[
                    {
                      icon: '✎',
                      label: 'Modifier',
                      onClick: () => openEdit(p),
                    },
                    {
                      icon: '🗑',
                      label: 'Supprimer',
                      onClick: () => handleDelete(p),
                    },
                  ]}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {starting && (
        <StartProgramModal
          program={starting}
          onClose={() => setStarting(null)}
          onStarted={(res) => {
            setStarting(null);
            flash(
              `Programme démarré : ${res.created} séance${res.created > 1 ? 's' : ''} ajoutée${res.created > 1 ? 's' : ''} au planning.`,
            );
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
