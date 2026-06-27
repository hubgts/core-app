/** Durée en minutes → « 1h30 » / « 45 min ». Renvoie null si vide. */
export function formatDuration(min) {
  if (!min) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h${m ? String(m).padStart(2, '0') : ''}` : `${m} min`;
}
