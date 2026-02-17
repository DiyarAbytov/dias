import React, { useEffect, useState } from 'react';
import './AnalyticsPage.scss';
import { apiClient } from '../../../../shared/api';
import { Loading, ErrorState } from '../../../../shared/ui';

const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    apiClient.get('analytics/summary/')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data || { error: err.message }))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={load} />;

  const sales = data?.sales;
  const shipments = data?.shipments;
  const warehouse = data?.warehouse;

  return (
    <div className="page page--analytics">
      <div className="analytics-cards">
        {sales != null && (
          <div className="analytics-card">
            <div className="analytics-card__label">Продажи</div>
            <div className="analytics-card__value">
              Объём: {Number(sales.total_quantity ?? 0).toLocaleString('ru-RU')}
            </div>
          </div>
        )}
        {shipments != null && (
          <div className="analytics-card">
            <div className="analytics-card__label">Отгрузки</div>
            <div className="analytics-card__value">
              Объём: {Number(shipments.total_quantity ?? 0).toLocaleString('ru-RU')}
            </div>
          </div>
        )}
        {warehouse != null && (
          <div className="analytics-card">
            <div className="analytics-card__label">Склад ГП</div>
            <div className="analytics-card__value">
              <div>Доступно: {Number(warehouse.available ?? 0).toLocaleString('ru-RU')}</div>
              <div>В резерве: {Number(warehouse.reserved ?? 0).toLocaleString('ru-RU')}</div>
            </div>
          </div>
        )}
        {!sales && !shipments && !warehouse && (
          <p className="analytics-empty">Нет данных для отображения.</p>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
