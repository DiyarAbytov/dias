import React from 'react';
import { useAuth } from '../../../features/auth';

const HomePage = () => {
  const { user } = useAuth();

  return (
    <div className="page page--home">
      <h1 className="page__title">Главная</h1>
      <p className="page__greeting">Добро пожаловать, {user?.name ?? user?.email}!</p>
      <p className="page__hint">Выберите раздел в меню для работы.</p>
    </div>
  );
};

export default HomePage;
