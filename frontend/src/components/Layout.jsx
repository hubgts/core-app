import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Logo from './Logo';
import './Layout.css';

// Entrées de navigation. Les modules s'ajoutent ici au fur et à mesure.
// `children` : sous-menu affiché quand la section est active.
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Tableau de bord', icon: '📊' },
  { to: '/habitudes', label: 'Habitudes', icon: '✅' },
  {
    to: '/entrainement',
    label: 'Entraînement',
    icon: '🏋️',
    children: [
      { to: '/entrainement', label: 'Planning', end: true },
      { to: '/entrainement/templates', label: 'Templates' },
      { to: '/entrainement/programmes', label: 'Programmes' },
      { to: '/entrainement/mensuration', label: 'Mensuration' },
    ],
  },
  {
    to: '/finances',
    label: 'Finances',
    icon: '💰',
    children: [
      { to: '/finances', label: "Vue d'ensemble", end: true },
      { to: '/finances/enveloppes', label: 'Enveloppes' },
      { to: '/finances/bilan', label: 'Bilan du mois' },
    ],
  },
  {
    to: '/budget',
    label: 'Budget',
    icon: '🎯',
    children: [
      { to: '/budget', label: "Vue d'ensemble", end: true },
      { to: '/budget/plan', label: 'Plan & dépenses' },
    ],
  },
  { to: '/savoir-faire', label: 'Savoir-faire', icon: '🛠️' },
  { to: '/alimentation', label: 'Alimentation', icon: '🍽️' },
  { to: '/course', label: 'Course', icon: '🛒' },
  { to: '/paris', label: 'Paris sportifs', icon: '🎰' },
  { to: '/referentiel', label: 'Référentiel', icon: '📚' },
];

export default function Layout() {
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  // Referme le tiroir mobile à chaque changement de page.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      {/* Barre supérieure (mobile uniquement) */}
      <header className="topbar">
        <button
          className="topbar__burger"
          onClick={() => setNavOpen(true)}
          aria-label="Ouvrir le menu"
        >
          ☰
        </button>
        <Logo size={26} />
        <span className="topbar__title">Core</span>
      </header>

      {navOpen && <div className="nav-scrim" onClick={() => setNavOpen(false)} />}

      <aside className={`sidebar${navOpen ? ' sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          <Logo size={36} />
          <div className="sidebar__brandtext">
            <span className="sidebar__title">Core</span>
          </div>
          <button
            className="sidebar__close"
            onClick={() => setNavOpen(false)}
            aria-label="Fermer le menu"
          >
            ✕
          </button>
        </div>

        <nav className="sidebar__nav">
          {NAV_ITEMS.map((item) => {
            const sectionActive = location.pathname.startsWith(item.to);
            return (
              <div key={item.to} className="nav-group">
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `nav-item${isActive ? ' nav-item--active' : ''}`
                  }
                >
                  <span className="nav-item__icon">{item.icon}</span>
                  <span className="nav-item__label">{item.label}</span>
                </NavLink>
                {item.children && sectionActive && (
                  <div className="nav-sub">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        end={child.end}
                        className={({ isActive }) =>
                          `nav-subitem${isActive ? ' nav-subitem--active' : ''}`
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="sidebar__footer">Core · v1</div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
