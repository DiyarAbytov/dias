import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/MainLayout';
import { LoginPage } from '../../features/auth';
import { LinesPage } from '../../features/lines';
import { UsersPage } from '../../features/users';
import { OrdersPage } from '../../features/orders';
import { ShipmentsPage } from '../../features/shipments';
import { AnalyticsPage } from '../../features/analytics';
import { MaterialsPage } from '../../features/materials';
import { ChemistryPage } from '../../features/chemistry';
import { RecipesPage } from '../../features/recipes';
import { ProductionPage } from '../../features/production';

const PlaceholderPage = ({ title }) => (
  <div className="page">
    <h1 className="page__title">{title}</h1>
    <p>Раздел в разработке.</p>
  </div>
);

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
      <Route index element={<Navigate to="/users" replace />} />
      <Route path="users" element={<ProtectedRoute accessKey="users"><UsersPage /></ProtectedRoute>} />
      <Route path="lines" element={<ProtectedRoute accessKey="lines"><LinesPage /></ProtectedRoute>} />
      <Route path="orders" element={<ProtectedRoute accessKey="orders"><OrdersPage /></ProtectedRoute>} />
      <Route path="shipments" element={<ProtectedRoute accessKey="shipments"><ShipmentsPage /></ProtectedRoute>} />
      <Route path="materials" element={<ProtectedRoute accessKey="materials"><MaterialsPage /></ProtectedRoute>} />
      <Route path="chemistry" element={<ProtectedRoute accessKey="chemistry"><ChemistryPage /></ProtectedRoute>} />
      <Route path="recipes" element={<ProtectedRoute accessKey="recipes"><RecipesPage /></ProtectedRoute>} />
      <Route path="production" element={<ProtectedRoute accessKey="production"><ProductionPage /></ProtectedRoute>} />
      <Route path="otk" element={<ProtectedRoute accessKey="otk"><PlaceholderPage title="ОТК" /></ProtectedRoute>} />
      <Route path="warehouse" element={<ProtectedRoute accessKey="warehouse"><PlaceholderPage title="Склад ГП" /></ProtectedRoute>} />
      <Route path="clients" element={<ProtectedRoute accessKey="clients"><PlaceholderPage title="Клиенты" /></ProtectedRoute>} />
      <Route path="sales" element={<ProtectedRoute accessKey="sales"><PlaceholderPage title="Продажи" /></ProtectedRoute>} />
      <Route path="analytics" element={<ProtectedRoute accessKey="analytics"><AnalyticsPage /></ProtectedRoute>} />
    </Route>
    <Route path="*" element={<Navigate to="/users" replace />} />
  </Routes>
);

export default AppRoutes;
