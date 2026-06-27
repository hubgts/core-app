import { useState } from 'react';
import { trainingApi } from '../../api/training';
import { PROGRAM_DAYS, TYPE_META } from './constants';
import ProgramSessionModal from './ProgramSessionModal';

const blankDraft = () => ({
  name: '',
  description: '',
  phases: [],
  weeks: [{ index: 1, phaseIndex: null, objective: '', isDeload: false, sessions: [] }],
});

// Normalise un programme chargé de l'API vers l'état d'édition.
function toDraft(program) {
  if (!program) return blankDraft();
  return {
    id: program.id,
    name: program.name ?? '',
    description: program.description ?? '',
    phases: (program.phases ?? []).map((p) => ({ name: p.name, objective: p.objective ?? '' })),
    weeks: (program.weeks ?? []).map((w) => ({
      index: w.index,
      phaseIndex: w.phaseIndex ?? null,
      objective: w.objective ?? '',
      isDeload: Boolean(w.isDeload),
      sessions: (w.sessions ?? []).map((s) => ({ ...s })),
    })),
  };
}

export default function ProgramEditor({ program, onSaved, onCancel }) {
  const [draft, setDraft] = useState(() => toDraft(program));
  const [sessionModal, setSessionModal] = useState(null); // { weekIdx, sessionIdx?, presetDay }
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const patch = (p) => setDraft((d) => ({ ...d, ...p }));
  const patchWeek = (wi, p) =>
    setDraft((d) => ({
      ...d,
      weeks: d.weeks.map((w, i) => (i === wi ? { ...w, ...p } : w)),
    }));

  // --- Phases ---
  const addPhase = () =>
    patch({ phases: [...draft.phases, { name: `Phase ${draft.phases.length + 1}`, objective: '' }] });
  const patchPhase = (pi, p) =>
    patch({ phases: draft.phases.map((ph, i) => (i === pi ? { ...ph, ...p } : ph)) });
  const removePhase = (pi) =>
    patch({
      phases: draft.phases.filter((_, i) => i !== pi),
      weeks: draft.weeks.map((w) => {
        if (w.phaseIndex === pi) return { ...w, phaseIndex: null };
        if (w.phaseIndex != null && w.phaseIndex > pi) return { ...w, phaseIndex: w.phaseIndex - 1 };
        return w;
      }),
    });

  // --- Semaines ---
  const addWeek = () => {
    const nextIndex = draft.weeks.reduce((m, w) => Math.max(m, w.index), 0) + 1;
    patch({
      weeks: [
        ...draft.weeks,
        { index: nextIndex, phaseIndex: null, objective: '', isDeload: false, sessions: [] },
      ],
    });
  };
  const removeWeek = (wi) => patch({ weeks: draft.weeks.filter((_, i) => i !== wi) });

  // --- Séances ---
  function saveSession(next) {
    const { weekIdx, sessionIdx } = sessionModal;
    setDraft((d) => ({
      ...d,
      weeks: d.weeks.map((w, i) => {
        if (i !== weekIdx) return w;
        const sessions =
          sessionIdx != null
            ? w.sessions.map((s, j) => (j === sessionIdx ? next : s))
            : [...w.sessions, next];
        return { ...w, sessions };
      }),
    }));
    setSessionModal(null);
  }
  function deleteSession() {
    const { weekIdx, sessionIdx } = sessionModal;
    setDraft((d) => ({
      ...d,
      weeks: d.weeks.map((w, i) =>
        i === weekIdx ? { ...w, sessions: w.sessions.filter((_, j) => j !== sessionIdx) } : w,
      ),
    }));
    setSessionModal(null);
  }

  async function save() {
    setError('');
    if (!draft.name.trim()) {
      setError('Donne un nom au programme.');
      return;
    }
    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      phases: draft.phases.map((p) => ({ name: p.name.trim(), objective: p.objective.trim() || null })),
      weeks: draft.weeks.map((w) => ({
        index: w.index,
        phaseIndex: w.phaseIndex,
        objective: w.objective.trim() || null,
        isDeload: w.isDeload,
        sessions: w.sessions.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          label: s.label ?? null,
          type: s.type,
          startTime: s.startTime ?? null,
          durationMin: s.durationMin ?? null,
          zone: s.zone ?? null,
          title: s.title ?? null,
          description: s.description ?? null,
          exercises: s.exercises ?? [],
          sourceTemplateId: s.sourceTemplateId ?? null,
        })),
      })),
    };
    setSaving(true);
    try {
      const saved = draft.id
        ? await trainingApi.updateProgram(draft.id, payload)
        : await trainingApi.createProgram(payload);
      onSaved(saved);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <div className="prog-editor">
      <header className="page-head">
        <div>
          <button className="btn btn--ghost btn--sm" onClick={onCancel}>‹ Programmes</button>
          <h1 className="page-head__title">{draft.id ? 'Modifier le programme' : 'Nouveau programme'}</h1>
        </div>
        <button className="btn btn--primary" onClick={save} disabled={saving}>
          {saving ? '…' : 'Enregistrer'}
        </button>
      </header>

      {error && <p className="banner banner--error">{error}</p>}

      <div className="form-row">
        <label className="field">
          <span className="field__label">Nom</span>
          <input
            className="field__input"
            maxLength={80}
            value={draft.name}
            placeholder="ex : Prise de masse 8 semaines"
            onChange={(e) => patch({ name: e.target.value })}
          />
        </label>
        <label className="field">
          <span className="field__label">Description (optionnelle)</span>
          <input
            className="field__input"
            value={draft.description}
            placeholder="Intention globale du cycle"
            onChange={(e) => patch({ description: e.target.value })}
          />
        </label>
      </div>

      {/* Phases */}
      <section className="prog-section">
        <div className="prog-section__head">
          <h2 className="prog-section__title">Phases</h2>
          <button className="btn btn--ghost btn--sm" onClick={addPhase}>+ Phase</button>
        </div>
        {draft.phases.length === 0 ? (
          <p className="muted">Aucune phase. Les semaines peuvent exister sans phase.</p>
        ) : (
          <div className="prog-phases">
            {draft.phases.map((ph, pi) => (
              <div key={pi} className="prog-phase">
                <input
                  className="field__input prog-phase__name"
                  value={ph.name}
                  placeholder="Nom de la phase"
                  onChange={(e) => patchPhase(pi, { name: e.target.value })}
                />
                <input
                  className="field__input"
                  value={ph.objective}
                  placeholder="Objectif (ex : Volume)"
                  onChange={(e) => patchPhase(pi, { objective: e.target.value })}
                />
                <button
                  className="icon-btn"
                  onClick={() => removePhase(pi)}
                  aria-label="Supprimer la phase"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Semaines */}
      <section className="prog-section">
        <div className="prog-section__head">
          <h2 className="prog-section__title">Semaines</h2>
          <button className="btn btn--ghost btn--sm" onClick={addWeek}>+ Semaine</button>
        </div>

        {draft.weeks.map((w, wi) => (
          <div key={wi} className={`prog-week${w.isDeload ? ' is-deload' : ''}`}>
            <div className="prog-week__head">
              <span className="prog-week__index">S{w.index}{w.isDeload ? ' 🌙' : ''}</span>
              <select
                className="field__input prog-week__phase"
                value={w.phaseIndex ?? ''}
                onChange={(e) =>
                  patchWeek(wi, { phaseIndex: e.target.value === '' ? null : Number(e.target.value) })
                }
              >
                <option value="">Hors phase</option>
                {draft.phases.map((ph, pi) => (
                  <option key={pi} value={pi}>{ph.name || `Phase ${pi + 1}`}</option>
                ))}
              </select>
              <input
                className="field__input prog-week__obj"
                value={w.objective}
                placeholder="Objectif de la semaine (optionnel)"
                onChange={(e) => patchWeek(wi, { objective: e.target.value })}
              />
              <label className="switch prog-week__deload">
                <input
                  type="checkbox"
                  checked={w.isDeload}
                  onChange={(e) => patchWeek(wi, { isDeload: e.target.checked })}
                />
                <span>Deload</span>
              </label>
              <button
                className="icon-btn"
                onClick={() => removeWeek(wi)}
                aria-label="Supprimer la semaine"
              >
                🗑
              </button>
            </div>

            <div className="prog-week__grid">
              {PROGRAM_DAYS.map((d) => {
                const daySessions = w.sessions
                  .map((s, idx) => ({ s, idx }))
                  .filter(({ s }) => s.dayOfWeek === d.value);
                return (
                  <div key={d.value} className="prog-day">
                    <div className="prog-day__label">{d.code}<span className="prog-day__sub">{d.label}</span></div>
                    {daySessions.map(({ s, idx }) => (
                      <button
                        key={idx}
                        type="button"
                        className="prog-pill"
                        style={{ '--c': TYPE_META[s.type]?.color }}
                        onClick={() => setSessionModal({ weekIdx: wi, sessionIdx: idx })}
                      >
                        <span>{TYPE_META[s.type]?.icon}</span>
                        <span className="prog-pill__txt">{s.label || TYPE_META[s.type]?.label}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      className="prog-day__add"
                      onClick={() => setSessionModal({ weekIdx: wi, presetDay: d.value })}
                      aria-label={`Ajouter une séance ${d.code}`}
                    >
                      +
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {sessionModal && (
        <ProgramSessionModal
          session={
            sessionModal.sessionIdx != null
              ? draft.weeks[sessionModal.weekIdx].sessions[sessionModal.sessionIdx]
              : undefined
          }
          presetDay={sessionModal.presetDay}
          onSave={saveSession}
          onDelete={deleteSession}
          onClose={() => setSessionModal(null)}
        />
      )}
    </div>
  );
}
