import { useEffect, useState } from 'react';

/*
 * Toast global (message éphémère en bas d'écran).
 *
 * API impérative — utilisable depuis n'importe quel handler, sans hook :
 *   toast('Enregistré.');
 *   toast('Erreur : …', 5000); // durée custom en ms
 *
 * Le composant <ToastHost /> doit être monté une seule fois à la racine
 * (main.jsx), comme <DialogHost />. Le style `.toast` vit dans index.css.
 */

let showRef = null; // (message, duration) => void — branché par <ToastHost />

export function toast(message, duration = 2600) {
  if (showRef) showRef(message, duration);
}

export function ToastHost() {
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let timer = null;
    showRef = (message, duration) => {
      setMsg(message);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setMsg(''), duration);
    };
    return () => {
      window.clearTimeout(timer);
      showRef = null;
    };
  }, []);

  if (!msg) return null;
  return <div className="toast">{msg}</div>;
}
