import React, { useState, useCallback } from 'react';
import { useServerQuery } from '../../../../shared/lib';
import { ServerList, FilterBar, ConfirmModal, useToast } from '../../../../shared/ui';
import { useAuth } from '../../../auth/model';
import { createUser, updateUser, deleteUser, updateUserAccess } from '../../api/usersApi';
import { createRole, updateRole, deleteRole } from '../../api/rolesApi';
import { ACCESS_KEYS, ACCESS_LABELS } from '../../../../shared/config/constants';
import './UsersPage.scss';

const USERS_FILTERS = (roleOptions) => [
  { key: 'search', type: 'search', placeholder: 'Поиск по имени' },
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
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('roles');
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
  const [accessModal, setAccessModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitError, setSubmitError] = useState('');

  const { refetch: refetchAuth } = useAuth();
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
      toast.show('Успешно сохранено');
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
      toast.show('Успешно сохранено');
    } catch (err) {
      setSubmitError(err.response?.data?.error || JSON.stringify(err.response?.data?.details || {}) || 'Ошибка');
    }
  };

  const handleAccessSave = async (userId, accessKeys) => {
    setSubmitError('');
    try {
      await updateUserAccess(userId, accessKeys);
      setAccessModal(null);
      refetch();
      refetchRoles();
      refetchAuth();
      toast.show('Успешно сохранено');
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.error
        || (data?.access_keys ? data.access_keys.join(', ') : null)
        || (typeof data?.details === 'object' ? JSON.stringify(data.details) : data?.details)
        || err.message
        || 'Ошибка сохранения доступов';
      setSubmitError(msg);
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
      toast.show('Успешно удалено');
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Ошибка удаления');
    }
  };

  return (
    <div className="page page--users">
      <div className="page__header">
        <div className="page__tabs">
          <button
            type="button"
            className={`page__tab ${activeTab === 'roles' ? 'page__tab--active' : ''}`}
            onClick={() => setActiveTab('roles')}
          >
            Роли
          </button>
          <button
            type="button"
            className={`page__tab ${activeTab === 'users' ? 'page__tab--active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Список
          </button>
        </div>
        <div className="page__actions">
          {activeTab === 'roles' && (
            <button type="button" className="btn btn--primary" onClick={() => setRoleModal({})}>
              + Создать
            </button>
          )}
          {activeTab === 'users' && (
            <button type="button" className="btn btn--primary" onClick={() => setUserModal({})}>
              + Добавить
            </button>
          )}
        </div>
      </div>

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
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {listItems.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.name}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--sm"
                        onClick={() => setRoleModal(r)}
                      >
                        Редактировать
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
                    <td>{u.role_name ?? (roles.find((r) => r.id === u.role)?.name) ?? '—'}</td>
                    <td>{u.is_active ? 'Да' : 'Нет'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--sm"
                        onClick={() => setAccessModal(u)}
                      >
                        Доступы
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm"
                        onClick={() => setUserModal(u)}
                      >
                        Редактировать
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

      {userModal && (
        <UserFormModal
          user={userModal?.id ? userModal : null}
          roles={roles}
          onSubmit={handleUserSubmit}
          onClose={() => { setUserModal(null); setSubmitError(''); }}
          error={submitError}
        />
      )}

      {accessModal && (
        <AccessModal
          user={accessModal}
          accessKeys={ACCESS_KEYS}
          accessLabels={ACCESS_LABELS}
          roles={roles}
          onSave={handleAccessSave}
          onClose={() => { setAccessModal(null); setSubmitError(''); }}
          error={submitError}
        />
      )}

      {roleModal && (
        <RoleFormModal
          role={roleModal?.id ? roleModal : null}
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

const AccessModal = ({ user, accessKeys, accessLabels, roles, onSave, onClose, error }) => {
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const { apiClient } = await import('../../../../shared/api');
        const res = await apiClient.get(`/users/${user.id}/`);
        const acc = res.data?.accesses || [];
        const keys = acc.map((a) => a.access_key ?? a);
        setSelected(new Set(keys));
      } catch {
        setSelected(new Set());
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

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
        <h3>Доступы: {user?.name}</h3>
        {loading ? (
          <p>Загрузка...</p>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (saving) return;
              setSaving(true);
              try {
                await onSave(user.id, Array.from(selected));
              } finally {
                setSaving(false);
              }
            }}
          >
            <label className="modal__access-label">Доступы к разделам</label>
            <div className="access-keys">
              {accessKeys.map((key) => (
                <label key={key} className="access-keys__item">
                  <input
                    type="checkbox"
                    checked={selected.has(key)}
                    onChange={() => toggle(key)}
                  />
                  {accessLabels[key] || key}
                </label>
              ))}
            </div>
            {error && <p className="modal__error">{error}</p>}
            <div className="modal__actions">
              <button type="button" className="btn btn--secondary" onClick={onClose} disabled={saving}>Отмена</button>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const UserFormModal = ({ user, roles, onSubmit, onClose, error }) => {
  const [name, setName] = useState(user?.name ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user?.role != null ? String(user.role) : '');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{user ? 'Редактировать сотрудника' : 'Добавить сотрудника'}</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const data = { name, role: role ? Number(role) : null };
            if (password) data.password = password;
            if (!user && !password) return;
            onSubmit(data);
          }}
        >
          <label>Имя *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
          <label>Пароль {user ? '(оставьте пустым, чтобы не менять)' : '*'}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!user}
          />
          <label>Роль *</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} required>
            <option value="">—</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          {error && <p className="modal__error">{error}</p>}
          <div className="modal__actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn--primary">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const RoleFormModal = ({ role, onSubmit, onClose, error }) => {
  const [name, setName] = useState(role?.name ?? '');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{role ? 'Редактировать роль' : 'Создать роль'}</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ name });
          }}
        >
          <label>Название *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
          {error && <p className="modal__error">{error}</p>}
          <div className="modal__actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn--primary">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UsersPage;
