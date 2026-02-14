import { apiClient } from '../../../shared/api';

export const login = async (email, password) => {
  const res = await apiClient.post('/auth/login', { email, password });
  return res.data;
};

export const logout = async () => {
  try {
    await apiClient.post('/auth/logout');
  } catch {
    // ignore
  }
};

export const getMe = async () => {
  const res = await apiClient.get('/me');
  return res.data;
};
