import { useEffect, useMemo, useRef, useState } from 'react';
import { formatQuantity, isSection, scaleQuantity } from './constants';
import { confirmDialog } from '../dialogs';

/**
 * Mode Réalisation : checklist d'exécution éphémère (RG-12). Rien n'est
 * enregistré. L'écran est maintenu allumé tant que le mode est ouvert (RG-13).
 */
export default function RealizationMode({ recipe, scale = 1, onClose }) {
  const [checked, setChecked] = useState(() => new Set());
  const wakeLockRef = useRef(null);

  // Wake lock best-effort (RG-13) : repli silencieux si indisponible.
  useEffect(() => {
    let released = false;
    async function acquire() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch {
        /* indisponible : on continue sans bloquer */
      }
    }
    acquire();
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !released) acquire();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisible);
      wakeLockRef.current?.release?.().catch(() => {});
    };
  }, []);

  const components = recipe.components;
  const steps = recipe.steps;

  // Items cochables = composants (hors sections) + étapes.
  const checkableIds = useMemo(
    () => [
      ...components.filter((c) => !isSection(c)).map((c) => c.id),
      ...steps.map((s) => s.id),
    ],
    [components, steps],
  );
  const total = checkableIds.length;
  const done = checkableIds.filter((id) => checked.has(id)).length;
  const currentStepId = steps.find((s) => !checked.has(s.id))?.id ?? null;

  function toggle(id) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function close() {
    if (
      checked.size > 0 &&
      !(await confirmDialog({
        message:
          'Quitter le mode Réalisation ? Les cases cochées seront perdues.',
        danger: true,
      }))
    ) {
      return;
    }
    onClose();
  }

  return (
    <div className="rmode">
      <header className="rmode__head">
        <button className="rmode__close" onClick={close} aria-label="Fermer">
          ✕
        </button>
        <span className="rmode__title">Réalisation · {recipe.title}</span>
        <span className="rmode__progress" aria-label={`${done} sur ${total}`}>
          <span className="rmode__bar">
            <span
              className="rmode__barfill"
              style={{ width: total ? `${(done / total) * 100}%` : '0%' }}
            />
          </span>
          {done}/{total}
        </span>
      </header>

      <div className="rmode__body">
        {components.length > 0 && (
          <section className="rmode__section">
            <h3>Composants</h3>
            <ul className="rmode__list">
              {components.map((c) =>
                isSection(c) ? (
                  <li key={c.id} className="rmode__sectionlabel">
                    {c.label.replace(/^[—-]\s*|\s*[—-]$/g, '')}
                  </li>
                ) : (
                  <li key={c.id}>
                    <label
                      className={`rmode__item${checked.has(c.id) ? ' rmode__item--done' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked.has(c.id)}
                        onChange={() => toggle(c.id)}
                      />
                      <span>
                        {c.quantity != null && (
                          <strong className="rmode__qty">
                            {formatQuantity(scaleQuantity(c.quantity, scale))}
                            {c.unit ? ` ${c.unit}` : ''}
                          </strong>
                        )}{' '}
                        {c.label}
                        {c.note && <em className="rmode__note"> — {c.note}</em>}
                      </span>
                    </label>
                  </li>
                ),
              )}
            </ul>
          </section>
        )}

        {steps.length > 0 && (
          <section className="rmode__section">
            <h3>Étapes</h3>
            <ol className="rmode__list">
              {steps.map((s, i) => (
                <li key={s.id}>
                  <label
                    className={`rmode__item rmode__item--step${checked.has(s.id) ? ' rmode__item--done' : ''}${s.id === currentStepId ? ' rmode__item--current' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked.has(s.id)}
                      onChange={() => toggle(s.id)}
                    />
                    <span>
                      <strong className="rmode__stepnum">{i + 1}.</strong>{' '}
                      {s.text}
                    </span>
                  </label>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      <footer className="rmode__foot">
        <button className="btn btn--primary" onClick={onClose}>
          ✓ Terminer
        </button>
      </footer>
    </div>
  );
}
