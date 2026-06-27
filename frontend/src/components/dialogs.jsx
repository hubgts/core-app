import { useEffect, useRef, useState } from 'react';
import './dialogs.css';

/*
 * Boîtes de dialogue custom (remplacent window.confirm / prompt / alert natifs).
 *
 * API impérative — utilisable depuis n'importe quel handler, sans hook :
 *   await confirmDialog('Supprimer ?')            -> Promise<boolean>
 *   await promptDialog('Renommer', valeurActuelle) -> Promise<string|null>
 *   await alertDialog('Aucun modèle disponible.')   -> Promise<void>
 *
 * Chaque fonction accepte aussi un objet d'options :
 *   confirmDialog({ title, message, confirmLabel, cancelLabel, danger })
 *   promptDialog({ title, message, defaultValue, placeholder, multiline, confirmLabel })
 *   alertDialog({ title, message, confirmLabel })
 *
 * Le composant <DialogHost /> doit être monté une seule fois à la racine.
 */

let openRef = null; // (config) => Promise — branché par <DialogHost />

function normalize(type, arg, maybeDefault) {
  if (arg == null) return { type };
  if (typeof arg === 'string') {
    const o = { type, title: arg };
    if (type === 'prompt' && maybeDefault !== undefined) o.defaultValue = maybeDefault;
    return o;
  }
  return { type, ...arg };
}

export function confirmDialog(arg) {
  if (!openRef) return Promise.resolve(false);
  return openRef(normalize('confirm', arg));
}

export function promptDialog(arg, defaultValue) {
  if (!openRef) return Promise.resolve(null);
  return openRef(normalize('prompt', arg, defaultValue));
}

export function alertDialog(arg) {
  if (!openRef) return Promise.resolve();
  return openRef(normalize('alert', arg));
}

function DialogModal({ dialog, onFinish }) {
  const {
    type,
    title,
    message,
    confirmLabel,
    cancelLabel = 'Annuler',
    danger = false,
    defaultValue = '',
    placeholder = '',
    multiline = false,
  } = dialog;

  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef(null);

  const cancelResult = type === 'confirm' ? false : type === 'prompt' ? null : undefined;
  const submit = () => onFinish(type === 'prompt' ? value : true);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onFinish(cancelResult);
      else if (e.key === 'Enter' && type !== 'prompt') {
        e.preventDefault();
        submit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, value]);

  useEffect(() => {
    if (type === 'prompt' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select?.();
    }
  }, [type]);

  const okLabel = confirmLabel || (type === 'alert' ? 'OK' : type === 'prompt' ? 'Valider' : 'Confirmer');

  return (
    <div className="modal-overlay modal-overlay--top" onMouseDown={() => onFinish(cancelResult)}>
      <div className="modal modal--dialog" onMouseDown={(e) => e.stopPropagation()} role="dialog">
        {title && <h2 className="modal__title">{title}</h2>}
        {message && <p className="dialog__message">{message}</p>}

        {type === 'prompt' &&
          (multiline ? (
            <textarea
              ref={inputRef}
              className="field__input dialog__textarea"
              value={value}
              placeholder={placeholder}
              onChange={(e) => setValue(e.target.value)}
            />
          ) : (
            <input
              ref={inputRef}
              className="field__input"
              value={value}
              placeholder={placeholder}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submit();
                }
              }}
            />
          ))}

        <div className="modal__actions">
          <div className="modal__actions-right">
            {type !== 'alert' && (
              <button type="button" className="btn btn--ghost" onClick={() => onFinish(cancelResult)}>
                {cancelLabel}
              </button>
            )}
            <button
              type="button"
              className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
              onClick={submit}
            >
              {okLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

let dialogSeq = 0;

export function DialogHost() {
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);

  useEffect(() => {
    openRef = (config) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setDialog({ ...config, _id: ++dialogSeq });
      });
    return () => {
      openRef = null;
    };
  }, []);

  const finish = (result) => {
    setDialog(null);
    const r = resolver.current;
    resolver.current = null;
    if (r) r(result);
  };

  if (!dialog) return null;
  // `key` force la réinitialisation de l'état interne (valeur du prompt) à chaque ouverture.
  return <DialogModal key={dialog._id} dialog={dialog} onFinish={finish} />;
}
