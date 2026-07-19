// État vide d'une page (aucune entrée) — rendu unique, plein centré sans bordure.
// À utiliser dès qu'une page/liste principale n'a encore rien à afficher, pour
// un rendu identique d'un module à l'autre.
//
// Props :
//   icon     : emoji illustratif (optionnel).
//   title    : titre court (optionnel ; ex. « Crée ton premier programme »).
//   action   : nœud d'action (optionnel ; typiquement un <button className="btn …">).
//   children : le texte descriptif (peut contenir du balisage inline).
export default function EmptyState({ icon, title, action, children }) {
  return (
    <div className="empty">
      {icon && <div className="empty__icon">{icon}</div>}
      {title && <h2 className="empty__title">{title}</h2>}
      {children && <p className="empty__text">{children}</p>}
      {action && <div className="empty__action">{action}</div>}
    </div>
  );
}
