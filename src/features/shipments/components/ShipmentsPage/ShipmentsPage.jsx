import React, { useState, useCallback } from 'react';
import { useServerQuery } from '../../../../shared/lib';
import { ServerList, FilterBar } from '../../../../shared/ui';

const SHIPMENTS_FILTERS = [
  { key: 'status', type: 'select', placeholder: 'Статус', options: [
    { value: 'pending', label: 'Ожидает' },
    { value: 'shipped', label: 'Отгружено' },
    { value: 'delivered', label: 'Доставлено' },
  ]},
  { key: 'client', type: 'select', placeholder: 'Клиент', options: [] },
  {
    key: 'ordering',
    type: 'ordering',
    placeholder: 'Сортировка',
    options: [
      { value: 'id', label: 'По ID' },
      { value: '-id', label: 'По ID (убыв.)' },
    ],
  },
];

const cleanQuery = (q) => {
  const copy = { ...q };
  Object.keys(copy).forEach((k) => {
    if (copy[k] === '' || copy[k] == null) delete copy[k];
  });
  return copy;
};

const statusLabel = (s) => ({ pending: 'Ожидает', shipped: 'Отгружено', delivered: 'Доставлено' }[s] ?? s);

const ShipmentsPage = () => {
  const [queryState, setQueryState] = useState({
    page: 1,
    page_size: 20,
    status: '',
    client: '',
    ordering: '',
  });

  const { items, meta, loading, error, refetch } = useServerQuery('shipments/', queryState);

  const handleFilterChange = useCallback((patch) => {
    setQueryState((prev) => ({ ...prev, ...patch, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page) => {
    setQueryState((prev) => ({ ...prev, page }));
  }, []);

  return (
    <div className="page page--shipments">
      <h1 className="page__title">Отгрузки</h1>
      <ServerList
        loading={loading}
        error={error}
        items={items}
        meta={meta}
        onRetry={refetch}
        renderFilters={() => (
          <FilterBar
            filters={SHIPMENTS_FILTERS}
            queryState={cleanQuery(queryState)}
            onChange={handleFilterChange}
          />
        )}
        renderTable={(listItems) => (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Клиент</th>
                <th>Продажа</th>
                <th>Кол-во</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {listItems.map((s) => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td>{s.client?.name ?? s.client}</td>
                  <td>{s.sale?.id ?? s.sale}</td>
                  <td>{s.quantity}</td>
                  <td>{statusLabel(s.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        renderPagination={(m) => (
          <>
            {m.page > 1 && <button onClick={() => handlePageChange(m.page - 1)}>← Назад</button>}
            <span>Страница {m.page} из {m.total_pages}</span>
            {m.page < m.total_pages && <button onClick={() => handlePageChange(m.page + 1)}>Вперёд →</button>}
          </>
        )}
      />
    </div>
  );
};

export default ShipmentsPage;
