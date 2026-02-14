import React from 'react';
import './FilterBar.scss';
import './FilterBar.scss';

const FilterBar = ({ filters, queryState, onChange }) => (
  <div className="filter-bar">
    {filters.map((f) => (
      <div key={f.key} className="filter-bar__item">
        {f.type === 'search' && (
          <input
            type="text"
            className="filter-bar__input"
            placeholder={f.placeholder ?? 'Поиск'}
            value={queryState[f.key] ?? ''}
            onChange={(e) => onChange({ [f.key]: e.target.value || undefined })}
          />
        )}
        {f.type === 'select' && (
          <select
            className="filter-bar__select"
            value={queryState[f.key] ?? ''}
            onChange={(e) => onChange({ [f.key]: e.target.value || undefined })}
          >
            <option value="">{f.placeholder ?? 'Все'}</option>
            {f.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
        {f.type === 'ordering' && (
          <select
            className="filter-bar__select"
            value={queryState[f.key] ?? ''}
            onChange={(e) => onChange({ [f.key]: e.target.value || undefined })}
          >
            <option value="">{f.placeholder ?? 'Сортировка'}</option>
            {f.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </div>
    ))}
  </div>
);

export default FilterBar;
