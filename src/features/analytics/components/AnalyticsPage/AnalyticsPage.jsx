import React, { useEffect, useState } from 'react';
import './AnalyticsPage.scss';
import { apiClient } from '../../../../shared/api';
import { Loading, ErrorState } from '../../../../shared/ui';

const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const f = async () => {
      try {
        const res = await apiClient.get('analytics/summary/');
        setData(res.data);
      } catch (err) {
        setError(err.response?.data || { error: err.message });
      } finally {
        setLoading(false);
      }
    };
    f();
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="page page--analytics">
      <h1 className="page__title">Аналитика</h1>
      <div className="analytics-cards">
        {data?.sales != null && (
          <div className="analytics-card">
            <div className="analytics-card__label">Продажи</div>
            <pre className="analytics-card__value">{JSON.stringify(data.sales, null, 2)}</pre>
          </div>
        )}
        {data?.shipments != null && (
          <div className="analytics-card">
            <div className="analytics-card__label">Отгрузки</div>
            <pre className="analytics-card__value">{JSON.stringify(data.shipments, null, 2)}</pre>
          </div>
        )}
        {data?.warehouse != null && (
          <div className="analytics-card">
            <div className="analytics-card__label">Склад ГП</div>
            <pre className="analytics-card__value">{JSON.stringify(data.warehouse, null, 2)}</pre>
          </div>
        )}
        {!data?.sales && !data?.shipments && !data?.warehouse && (
          <p>Нет данных для отображения.</p>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
