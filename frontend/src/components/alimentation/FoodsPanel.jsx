import { Link } from 'react-router-dom';

/**
 * Panneau « Aliments » du Référentiel : les aliments portent des macros et se
 * gèrent sur une page dédiée (tableau + calcul des calories). Ce panneau ne
 * fait qu'orienter vers cette page pour éviter de dupliquer le CRUD.
 */
export default function FoodsPanel() {
  return (
    <div className="ref-redirect">
      <p className="ref-empty">
        Les aliments (glucides, protéines, lipides, calories pour 100 g/ml) se
        gèrent sur leur page dédiée.
      </p>
      <Link to="/alimentation/aliments" className="btn btn--primary">
        Ouvrir la gestion des aliments
      </Link>
    </div>
  );
}
