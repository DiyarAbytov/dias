import React, { useState, useCallback } from 'react';
import { useServerQuery } from '../../../../shared/lib';
import { ServerList, FilterBar } from '../../../../shared/ui';

const LINES_FILTERS = [
  { key: 'search', type: 'search', placeholder: 'Поиск по названию' },
  {
    key: 'ordering',
    type: 'ordering',
    placeholder: 'Сортировка',
    options: [
      { value: 'id', label: 'По ID' },
      { value: '-id', label: 'По ID (убыв.)' },
      { value: 'name', label: 'По названию' },
      { value: '-name', label: 'По названию (убыв.)' },
    ],
  },
];

const LinesPage = () => {
  const [queryState, setQueryState] = useState({
    page: 1,
    page_size: 20,
    search: '',
    ordering: '',
  });

  const { items, meta, loading, error, refetch } = useServerQuery('lines/', queryState);

  const handleFilterChange = useCallback((patch) => {
    setQueryState((prev) => ({ ...prev, ...patch, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page) => {
    setQueryState((prev) => ({ ...prev, page }));
  }, []);

  const cleanQuery = (q) => {
    const copy = { ...q };
    Object.keys(copy).forEach((k) => {
      if (copy[k] === '' || copy[k] == null) delete copy[k];
    });
    return copy;
  };

  return (
    <div className="page page--lines">
      <h1 className="page__title">Линии</h1>
      <ServerList
        loading={loading}
        error={error}
        items={items}
        meta={meta}
        onRetry={refetch}
        renderFilters={() => (
          <FilterBar
            filters={LINES_FILTERS}
            queryState={cleanQuery(queryState)}
            onChange={handleFilterChange}
          />
        )}
        renderTable={(listItems) => (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Название</th>
              </tr>
            </thead>
            <tbody>
              {listItems.map((line) => (
                <tr key={line.id}>
                  <td>{line.id}</td>
                  <td>{line.name}</td>
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
            <span>
              Страница {m.page} из {m.total_pages}
            </span>
            {m.page < m.total_pages && (
              <button onClick={() => handlePageChange(m.page + 1)}>Вперёд →</button>
            )}
          </>
        )}
      />
    </div>
  );
};

export default LinesPage;
