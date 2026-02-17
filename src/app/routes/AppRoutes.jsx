import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/MainLayout';
import { LoginPage } from '../../features/auth';
import { useAuth } from '../../features/auth';
import { LinesPage } from '../../features/lines';
import { UsersPage } from '../../features/users';
import { OrdersPage } from '../../features/orders';
import { AnalyticsPage } from '../../features/analytics';
import { MaterialsPage } from '../../features/materials';
import { ChemistryPage } from '../../features/chemistry';
import { RecipesPage } from '../../features/recipes';
import { ProductionPage } from '../../features/production';
import { OTKPage } from '../../features/otk';
import { WarehousePage } from '../../features/warehouse';
import { STAGE2_TABS_ENABLED } from '../../shared/config/constants';

const PlaceholderPage = ({ title }) => (
  <div className="page">
    <h1 className="page__title">{title}</h1>
    <p>Нет доступа.</p>
  </div>
);

const ACCESS_ROUTE_MAP = {
  users: '/users',
  lines: '/lines',
  materials: '/materials',
  chemistry: '/chemistry',
  recipes: '/recipes',
  orders: '/orders',
  production: '/production',
  otk: '/otk',
  warehouse: '/warehouse',
  analytics: '/analytics',
  ...(STAGE2_TABS_ENABLED ? { clients: '/clients', sales: '/sales', shipments: '/shipments' } : {}),
};

const DefaultHomeRedirect = () => {
  const { user } = useAuth();
  const accesses = user?.accesses;
  if (!Array.isArray(accesses) || accesses.length === 0) {
    return <Navigate to="/users" replace />;
  }
  for (const key of accesses) {
    const path = ACCESS_ROUTE_MAP[key];
    if (path) return <Navigate to={path} replace />;
  }
  return <Navigate to="/forbidden" replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route
      path="/"
      element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<DefaultHomeRedirect />} />
      <Route path="users" element={<ProtectedRoute accessKey="users"><UsersPage /></ProtectedRoute>} />
      <Route path="lines" element={<ProtectedRoute accessKey="lines"><LinesPage /></ProtectedRoute>} />
      <Route path="orders" element={<ProtectedRoute accessKey="orders"><OrdersPage /></ProtectedRoute>} />
      <Route path="materials" element={<ProtectedRoute accessKey="materials"><MaterialsPage /></ProtectedRoute>} />
      <Route path="chemistry" element={<ProtectedRoute accessKey="chemistry"><ChemistryPage /></ProtectedRoute>} />
      <Route path="recipes" element={<ProtectedRoute accessKey="recipes"><RecipesPage /></ProtectedRoute>} />
      <Route path="production" element={<ProtectedRoute accessKey="production"><ProductionPage /></ProtectedRoute>} />
      <Route path="otk" element={<ProtectedRoute accessKey="otk"><OTKPage /></ProtectedRoute>} />
      <Route path="warehouse" element={<ProtectedRoute accessKey="warehouse"><WarehousePage /></ProtectedRoute>} />
      <Route path="analytics" element={<ProtectedRoute accessKey="analytics"><AnalyticsPage /></ProtectedRoute>} />
      {STAGE2_TABS_ENABLED && (
        <>
          <Route path="clients" element={<ProtectedRoute accessKey="clients"><PlaceholderPage title="Клиенты" /></ProtectedRoute>} />
          <Route path="sales" element={<ProtectedRoute accessKey="sales"><PlaceholderPage title="Продажи" /></ProtectedRoute>} />
          <Route path="shipments" element={<ProtectedRoute accessKey="shipments"><PlaceholderPage title="Отгрузки" /></ProtectedRoute>} />
        </>
      )}
      <Route path="forbidden" element={<PlaceholderPage title="Нет доступа" />} />
    </Route>
    <Route path="*" element={<Navigate to="/users" replace />} />
  </Routes>
);

export default AppRoutes;
