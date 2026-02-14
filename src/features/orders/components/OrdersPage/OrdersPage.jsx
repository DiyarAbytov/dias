import React, { useState, useCallback } from 'react';
import { useServerQuery } from '../../../../shared/lib';
import { ServerList, FilterBar } from '../../../../shared/ui';

const ORDERS_FILTERS = [
  { key: 'status', type: 'select', placeholder: 'Статус', options: [
    { value: 'created', label: 'Создан' },
    { value: 'in_progress', label: 'В работе' },
    { value: 'done', label: 'Выполнен' },
  ]},
  { key: 'recipe', type: 'select', placeholder: 'Рецепт', options: [] },
  { key: 'line', type: 'select', placeholder: 'Линия', options: [] },
  {
    key: 'ordering',
    type: 'ordering',
    placeholder: 'Сортировка',
    options: [
      { value: 'id', label: 'По ID' },
      { value: '-id', label: 'По ID (убыв.)' },
      { value: 'date', label: 'По дате' },
      { value: '-date', label: 'По дате (убыв.)' },
      { value: 'status', label: 'По статусу' },
      { value: '-status', label: 'По статусу (убыв.)' },
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

const statusLabel = (s) => ({ created: 'Создан', in_progress: 'В работе', done: 'Выполнен' }[s] ?? s);

const OrdersPage = () => {
  const [queryState, setQueryState] = useState({
    page: 1,
    page_size: 20,
    status: '',
    recipe: '',
    line: '',
    ordering: '',
  });

  const { items, meta, loading, error, refetch } = useServerQuery('orders/', queryState);

  const handleFilterChange = useCallback((patch) => {
    setQueryState((prev) => ({ ...prev, ...patch, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page) => {
    setQueryState((prev) => ({ ...prev, page }));
  }, []);

  return (
    <div className="page page--orders">
      <h1 className="page__title">Заказы на производство</h1>
      <ServerList
        loading={loading}
        error={error}
        items={items}
        meta={meta}
        onRetry={refetch}
        renderFilters={() => (
          <FilterBar
            filters={ORDERS_FILTERS}
            queryState={cleanQuery(queryState)}
            onChange={handleFilterChange}
          />
        )}
        renderTable={(listItems) => (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Рецепт</th>
                <th>Линия</th>
                <th>Кол-во</th>
                <th>Дата</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {listItems.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.recipe?.recipe ?? o.recipe}</td>
                  <td>{o.line?.name ?? o.line}</td>
                  <td>{o.quantity}</td>
                  <td>{o.date}</td>
                  <td>{statusLabel(o.status)}</td>
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

export default OrdersPage;
