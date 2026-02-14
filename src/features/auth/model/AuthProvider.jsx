import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as loginApi, logout as logoutApi, getMe } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await getMe();
      const u = data.user || data;
      setUser(u);
      localStorage.setItem('user', JSON.stringify(u));
    } catch {
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (email, password) => {
    const data = await loginApi(email, password);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
  }, []);

  const logout = useCallback(async () => {
    await logoutApi();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const value = { user, loading, login, logout, refetch: loadUser };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
