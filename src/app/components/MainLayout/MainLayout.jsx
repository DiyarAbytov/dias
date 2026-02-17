import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../features/auth';
import { STAGE2_TABS_ENABLED, ACCESS_LABELS } from '../../../shared/config/constants';
import './MainLayout.scss';

const MVP_NAV = [
  { path: '/analytics', accessKey: 'analytics' },
  { path: '/users', accessKey: 'users' },
  { path: '/lines', accessKey: 'lines' },
  { path: '/materials', accessKey: 'materials' },
  { path: '/chemistry', accessKey: 'chemistry' },
  { path: '/recipes', accessKey: 'recipes' },
  { path: '/orders', accessKey: 'orders' },
  { path: '/production', accessKey: 'production' },
  { path: '/otk', accessKey: 'otk' },
  { path: '/warehouse', accessKey: 'warehouse' },
];

const STAGE2_NAV = [
  { path: '/clients', accessKey: 'clients' },
  { path: '/sales', accessKey: 'sales' },
  { path: '/shipments', accessKey: 'shipments' },
];

const NAV_ITEMS = [
  ...MVP_NAV,
  ...(STAGE2_TABS_ENABLED ? STAGE2_NAV : []),
].map((item) => ({ ...item, label: ACCESS_LABELS[item.accessKey] || item.accessKey }));

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const filteredNav = NAV_ITEMS.filter(
    (item) =>
      !item.accessKey ||
      !user?.accesses ||
      user.accesses.length === 0 ||
      user.accesses.includes(item.accessKey)
  );

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const displayName = user?.name || user?.email || 'Пользователь';
  
  // Определяем название текущей страницы
  const currentPage = NAV_ITEMS.find(item => item.path === location.pathname);
  const pageTitle = currentPage?.label || 'DIAS';

  return (
    <div className="main-layout">
      <aside className="main-layout__sidebar">
        <div className="main-layout__logo">DIAS</div>
        <nav className="main-layout__nav">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`main-layout__link ${isActive ? 'main-layout__link--active' : ''}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="main-layout__body">
        <header className="main-layout__header">
          <h1 className="main-layout__page-title">{pageTitle}</h1>
          <div className="main-layout__user">
            <span className="main-layout__user-name">{displayName}</span>
            <button type="button" className="main-layout__logout" onClick={handleLogout}>
              Выйти
            </button>
          </div>
        </header>
        <main className="main-layout__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
