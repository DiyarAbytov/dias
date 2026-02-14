import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../features/auth';

const ProtectedRoute = ({ children, accessKey }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (accessKey && user.accesses && !user.accesses.includes(accessKey)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export default ProtectedRoute;
