import React, { useState, useCallback } from 'react';
import { useServerQuery } from '../../../../shared/lib';
import { ServerList, FilterBar } from '../../../../shared/ui';

const USERS_FILTERS = [
  { key: 'search', type: 'search', placeholder: 'Поиск по имени, email' },
  { key: 'role', type: 'select', placeholder: 'Роль', options: [] },
  { key: 'is_active', type: 'select', placeholder: 'Статус', options: [
    { value: 'true', label: 'Активные' },
    { value: 'false', label: 'Неактивные' },
  ]},
  {
    key: 'ordering',
    type: 'ordering',
    placeholder: 'Сортировка',
    options: [
      { value: 'id', label: 'По ID' },
      { value: '-id', label: 'По ID (убыв.)' },
      { value: 'name', label: 'По имени' },
      { value: '-name', label: 'По имени (убыв.)' },
      { value: 'email', label: 'По email' },
      { value: '-email', label: 'По email (убыв.)' },
      { value: 'date_joined', label: 'По дате' },
      { value: '-date_joined', label: 'По дате (убыв.)' },
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

const UsersPage = () => {
  const [queryState, setQueryState] = useState({
    page: 1,
    page_size: 20,
    search: '',
    role: '',
    is_active: '',
    ordering: '',
  });

  const { items, meta, loading, error, refetch } = useServerQuery('users/', queryState);

  const handleFilterChange = useCallback((patch) => {
    setQueryState((prev) => ({ ...prev, ...patch, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page) => {
    setQueryState((prev) => ({ ...prev, page }));
  }, []);

  return (
    <div className="page page--users">
      <h1 className="page__title">Пользователи</h1>
      <ServerList
        loading={loading}
        error={error}
        items={items}
        meta={meta}
        onRetry={refetch}
        renderFilters={() => (
          <FilterBar
            filters={USERS_FILTERS}
            queryState={cleanQuery(queryState)}
            onChange={handleFilterChange}
          />
        )}
        renderTable={(listItems) => (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Имя</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Активен</th>
              </tr>
            </thead>
            <tbody>
              {listItems.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role_name ?? u.role}</td>
                  <td>{u.is_active ? 'Да' : 'Нет'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        renderPagination={(m) => (
          <>
            {m.page > 1 && (
              <button onClick={() => handlePageChange(m.page - 1)}>← Назад</button>
            )}
            <span>Страница {m.page} из {m.total_pages}</span>
            {m.page < m.total_pages && (
              <button onClick={() => handlePageChange(m.page + 1)}>Вперёд →</button>
            )}
          </>
        )}
      />
    </div>
  );
};

export default UsersPage;
