import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../features/auth';

const AppProviders = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>{children}</AuthProvider>
  </BrowserRouter>
);

export default AppProviders;
