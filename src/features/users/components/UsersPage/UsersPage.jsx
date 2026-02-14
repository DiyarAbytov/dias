import React, { useState, useCallback } from 'react';
import { useServerQuery } from '../../../../shared/lib';
import { ServerList, FilterBar, ConfirmModal } from '../../../../shared/ui';
import { createUser, updateUser, deleteUser } from '../../api/usersApi';
import { createRole, updateRole, deleteRole } from '../../api/rolesApi';
import './UsersPage.scss';

const ACCESS_KEYS = [
  'users', 'lines', 'materials', 'chemistry', 'recipes', 'orders',
  'production', 'otk', 'warehouse', 'clients', 'sales', 'shipments', 'analytics'
];

const USERS_FILTERS = (roleOptions) => [
  { key: 'search', type: 'search', placeholder: 'Поиск по имени, email' },
  { key: 'role', type: 'select', placeholder: 'Роль', options: roleOptions },
  { key: 'is_active', type: 'select', placeholder: 'Статус', options: [
    { value: 'true', label: 'Активные' },
    { value: 'false', label: 'Неактивные' },
  ]},
  { key: 'ordering', type: 'ordering', placeholder: 'Сортировка', options: [
    { value: 'id', label: 'По ID' },
    { value: '-id', label: 'По ID (убыв.)' },
    { value: 'name', label: 'По имени' },
    { value: '-name', label: 'По имени (убыв.)' },
  ]},
];

const cleanQuery = (q) => {
  const copy = { ...q };
  Object.keys(copy).forEach((k) => {
    if (copy[k] === '' || copy[k] == null) delete copy[k];
  });
  return copy;
};

const UsersPage = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [queryState, setQueryState] = useState({
    page: 1,
    page_size: 20,
    search: '',
    role: '',
    is_active: '',
    ordering: '',
  });
  const [userModal, setUserModal] = useState(null);
  const [roleModal, setRoleModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitError, setSubmitError] = useState('');

  const { items: users, meta, loading, error, refetch } = useServerQuery(
    'users/',
    queryState,
    { enabled: activeTab === 'users' }
  );
  const { items: roles, loading: rolesLoading, error: rolesError, refetch: refetchRoles } = useServerQuery(
    'roles/',
    { page_size: 100 },
    { enabled: true }
  );

  const roleOptions = [{ value: '', label: 'Все' }, ...roles.map((r) => ({ value: String(r.id), label: r.name }))];

  const handleFilterChange = useCallback((patch) => {
    setQueryState((prev) => ({ ...prev, ...patch, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page) => {
    setQueryState((prev) => ({ ...prev, page }));
  }, []);

  const handleUserSubmit = async (data) => {
    setSubmitError('');
    try {
      if (userModal?.id) {
        await updateUser(userModal.id, data);
      } else {
        await createUser(data);
      }
      setUserModal(null);
      refetch();
      refetchRoles();
    } catch (err) {
      setSubmitError(err.response?.data?.error || err.response?.data?.details || 'Ошибка');
    }
  };

  const handleRoleSubmit = async (data) => {
    setSubmitError('');
    try {
      if (roleModal?.id) {
        await updateRole(roleModal.id, data);
      } else {
        await createRole(data);
      }
      setRoleModal(null);
      refetch();
      refetchRoles();
    } catch (err) {
      setSubmitError(err.response?.data?.error || JSON.stringify(err.response?.data?.details || {}) || 'Ошибка');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitError('');
    try {
      if (deleteTarget.type === 'user') {
        await deleteUser(deleteTarget.id);
      } else {
        await deleteRole(deleteTarget.id);
      }
      setDeleteTarget(null);
      refetch();
      refetchRoles();
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Ошибка удаления');
    }
  };

  return (
    <div className="page page--users">
      <div className="page__header">
        <h1 className="page__title">Пользователи</h1>
        <div className="page__tabs">
          <button
            type="button"
            className={`page__tab ${activeTab === 'users' ? 'page__tab--active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Пользователи
          </button>
          <button
            type="button"
            className={`page__tab ${activeTab === 'roles' ? 'page__tab--active' : ''}`}
            onClick={() => setActiveTab('roles')}
          >
            Роли
          </button>
        </div>
        <div className="page__actions">
          {activeTab === 'users' && (
            <button type="button" className="btn btn--primary" onClick={() => setUserModal({})}>
              + Создать пользователя
            </button>
          )}
          {activeTab === 'roles' && (
            <button type="button" className="btn btn--primary" onClick={() => setRoleModal({})}>
              + Создать роль
            </button>
          )}
        </div>
      </div>

      {activeTab === 'users' && (
        <ServerList
          loading={loading}
          error={error}
          items={users}
          meta={meta}
          onRetry={refetch}
          renderFilters={() => (
            <FilterBar
              filters={USERS_FILTERS(roleOptions)}
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
                  <th></th>
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
                    <td>
                      <button
                        type="button"
                        className="btn btn--sm"
                        onClick={() => setUserModal(u)}
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm btn--danger"
                        onClick={() => setDeleteTarget({ type: 'user', id: u.id, name: u.name })}
                      >
                        Удалить
                      </button>
                    </td>
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
      )}

      {activeTab === 'roles' && (
        <ServerList
          loading={rolesLoading}
          error={rolesError}
          items={roles}
          meta={{ page: 1, total_pages: 1 }}
          onRetry={refetchRoles}
          renderTable={(listItems) => (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Название</th>
                  <th>Описание</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {listItems.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.name}</td>
                    <td>{r.description || '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--sm"
                        onClick={() => setRoleModal(r)}
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm btn--danger"
                        onClick={() => setDeleteTarget({ type: 'role', id: r.id, name: r.name })}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        />
      )}

      {userModal && (
        <UserFormModal
          user={userModal?.id ? userModal : null}
          roles={roles}
          onSubmit={handleUserSubmit}
          onClose={() => { setUserModal(null); setSubmitError(''); }}
          error={submitError}
        />
      )}

      {roleModal && (
        <RoleFormModal
          role={roleModal?.id ? roleModal : null}
          accessKeys={ACCESS_KEYS}
          onSubmit={handleRoleSubmit}
          onClose={() => { setRoleModal(null); setSubmitError(''); }}
          error={submitError}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Удалить?"
        message={deleteTarget ? `Вы уверены, что хотите удалить "${deleteTarget.name}"?` : ''}
        confirmText="Удалить"
        onConfirm={handleDelete}
        onCancel={() => { setDeleteTarget(null); setSubmitError(''); }}
      />
    </div>
  );
};

const UserFormModal = ({ user, roles, onSubmit, onClose, error }) => {
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user?.role ? String(user.role) : '');
  const [isActive, setIsActive] = useState(user?.is_active ?? true);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{user ? 'Редактировать пользователя' : 'Создать пользователя'}</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const data = { name, email, role: role ? Number(role) : null, is_active: isActive };
            if (password) data.password = password;
            onSubmit(data);
          }}
        >
          <label>Имя</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={!!user}
          />
          <label>Пароль {user && '(оставьте пустым, чтобы не менять)'}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <label>Роль</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">—</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <label>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Активен
          </label>
          {error && <p className="modal__error">{error}</p>}
          <div className="modal__actions">
            <button type="button" onClick={onClose}>Отмена</button>
            <button type="submit">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const RoleFormModal = ({ role, accessKeys, onSubmit, onClose, error }) => {
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [selected, setSelected] = useState(() => {
    if (role?.accesses?.length) {
      return new Set(role.accesses.map((a) => a.access_key || a));
    }
    return new Set();
  });

  const toggle = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <h3>{role ? 'Редактировать роль' : 'Создать роль'}</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              name,
              description,
              access_keys: Array.from(selected),
            });
          }}
        >
          <label>Название</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
          <label>Описание</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          <label>Доступы</label>
          <div className="access-keys">
            {accessKeys.map((key) => (
              <label key={key} className="access-keys__item">
                <input
                  type="checkbox"
                  checked={selected.has(key)}
                  onChange={() => toggle(key)}
                />
                {key}
              </label>
            ))}
          </div>
          {error && <p className="modal__error">{error}</p>}
          <div className="modal__actions">
            <button type="button" onClick={onClose}>Отмена</button>
            <button type="submit">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UsersPage;
