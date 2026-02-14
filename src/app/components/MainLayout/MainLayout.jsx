import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../features/auth';
import './MainLayout.scss';

const NAV_ITEMS = [
  { path: '/analytics', label: 'Аналитика', accessKey: 'analytics' },
  { path: '/users', label: 'Пользователи', accessKey: 'users' },
  { path: '/lines', label: 'Линии', accessKey: 'lines' },
  { path: '/materials', label: 'Склад сырья', accessKey: 'materials' },
  { path: '/chemistry', label: 'Химия', accessKey: 'chemistry' },
  { path: '/recipes', label: 'Рецепты', accessKey: 'recipes' },
  { path: '/orders', label: 'Заказы', accessKey: 'orders' },
  { path: '/production', label: 'Производство', accessKey: 'production' },
  { path: '/otk', label: 'ОТК', accessKey: 'otk' },
  { path: '/warehouse', label: 'Склад ГП', accessKey: 'warehouse' },
  { path: '/clients', label: 'Клиенты', accessKey: 'clients' },
  { path: '/sales', label: 'Продажи', accessKey: 'sales' },
  { path: '/shipments', label: 'Отгрузки', accessKey: 'shipments' },
];

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
