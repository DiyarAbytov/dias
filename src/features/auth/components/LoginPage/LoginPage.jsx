import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../model';
import './LoginPage.scss';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name || !password) {
      setError('Укажите имя и пароль');
      return;
    }
    setLoading(true);
    try {
      await login(name, password);
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Ошибка входа';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-page__card">
        <h1 className="login-page__title">DIAS</h1>
        <form className="login-page__form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="login-page__input"
            placeholder="Имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="username"
          />
          <input
            type="password"
            className="login-page__input"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {error && <p className="login-page__error">{error}</p>}
          <button type="submit" className="login-page__btn" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
