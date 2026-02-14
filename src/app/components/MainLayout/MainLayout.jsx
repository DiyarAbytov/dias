import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../features/auth';
import './MainLayout.scss';

const NAV_ITEMS = [
  { path: '/', label: 'Главная', accessKey: null },
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
  { path: '/analytics', label: 'Аналитика', accessKey: 'analytics' },
];

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const filteredNav = NAV_ITEMS.filter(
    (item) => !item.accessKey || (user?.accesses && user.accesses.includes(item.accessKey))
  );

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="main-layout">
      <header className="main-layout__header">
        <nav className="main-layout__nav">
          {filteredNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `main-layout__link ${isActive ? 'main-layout__link--active' : ''}`
              }
              end={item.path === '/'}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="main-layout__user">
          <span>{user?.name ?? user?.email}</span>
          <button type="button" className="main-layout__logout" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      </header>
      <main className="main-layout__main">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
