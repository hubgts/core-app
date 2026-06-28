import { useEffect, useMemo, useRef, useState } from 'react';
import {
  formatQuantity,
  formatServings,
  isSection,
  scaleQuantity,
} from './constants';
import { confirmDialog } from '../dialogs';

/**
 * Mode Cuisine : checklist d'exécution éphémère (RG-12). Rien n'est enregistré.
 * L'écran est maintenu allumé tant que le mode est ouvert (RG-13).
 */
export default function CookMode({ recipe, scale = 1, onClose }) {
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

  const ingredients = recipe.ingredients;
  const steps = recipe.steps;

  // Portions affichées (mise à l'échelle choisie dans le détail).
  const shownServings =
    recipe.servings != null ? Math.round(recipe.servings * scale) : null;

  // Items cochables = ingrédients (hors sections) + étapes.
  const checkableIds = useMemo(
    () => [
      ...ingredients.filter((i) => !isSection(i)).map((i) => i.id),
      ...steps.map((s) => s.id),
    ],
    [ingredients, steps],
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
        message: 'Quitter le mode Cuisine ? Les cases cochées seront perdues.',
        danger: true,
      }))
    ) {
      return;
    }
    onClose();
  }

  return (
    <div className="alcook">
      <header className="alcook__head">
        <button className="alcook__close" onClick={close} aria-label="Fermer">
          ✕
        </button>
        <span className="alcook__title">
          Cuisine · {recipe.title}
          {shownServings != null && (
            <span className="alcook__servings">
              {' '}
              · {formatServings(shownServings)}
            </span>
          )}
        </span>
        <span className="alcook__progress" aria-label={`${done} sur ${total}`}>
          <span className="alcook__bar">
            <span
              className="alcook__barfill"
              style={{ width: total ? `${(done / total) * 100}%` : '0%' }}
            />
          </span>
          {done}/{total}
        </span>
      </header>

      <div className="alcook__body">
        {ingredients.length > 0 && (
          <section className="alcook__section">
            <h3>Ingrédients</h3>
            <ul className="alcook__list">
              {ingredients.map((i) =>
                isSection(i) ? (
                  <li key={i.id} className="alcook__sectionlabel">
                    {i.label.replace(/^[—-]\s*|\s*[—-]$/g, '')}
                  </li>
                ) : (
                  <li key={i.id}>
                    <label
                      className={`alcook__item${checked.has(i.id) ? ' alcook__item--done' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked.has(i.id)}
                        onChange={() => toggle(i.id)}
                      />
                      <span>
                        {i.quantity != null && (
                          <strong className="alcook__qty">
                            {formatQuantity(scaleQuantity(i.quantity, scale))}
                            {i.unit ? ` ${i.unit}` : ''}
                          </strong>
                        )}{' '}
                        {i.label}
                        {i.note && (
                          <em className="alcook__note"> — {i.note}</em>
                        )}
                      </span>
                    </label>
                  </li>
                ),
              )}
            </ul>
          </section>
        )}

        {steps.length > 0 && (
          <section className="alcook__section">
            <h3>Étapes</h3>
            <ol className="alcook__list">
              {steps.map((s, i) => (
                <li key={s.id}>
                  <label
                    className={`alcook__item alcook__item--step${checked.has(s.id) ? ' alcook__item--done' : ''}${s.id === currentStepId ? ' alcook__item--current' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked.has(s.id)}
                      onChange={() => toggle(s.id)}
                    />
                    <span>
                      <strong className="alcook__stepnum">{i + 1}.</strong>{' '}
                      {s.text}
                    </span>
                  </label>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      <footer className="alcook__foot">
        <button className="btn btn--primary" onClick={onClose}>
          ✓ Terminer
        </button>
      </footer>
    </div>
  );
}
