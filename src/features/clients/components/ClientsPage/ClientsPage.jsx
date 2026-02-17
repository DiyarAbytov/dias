import React, { useState } from 'react';
import { useServerQuery } from '../../../../shared/lib';
import { ConfirmModal, EmptyState, ErrorState, Loading } from '../../../../shared/ui';
import { apiClient } from '../../../../shared/api';

const ClientsPage = () => {
  const [queryState, setQueryState] = useState({ page: 1, page_size: 20, search: '' });
  const [modalClient, setModalClient] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const { items, loading, error, refetch } = useServerQuery('clients/', queryState, { enabled: true });

  const handleSubmit = async (payload) => {
    setSubmitError('');
    try {
      if (modalClient?.id) {
        await apiClient.patch(`clients/${modalClient.id}/`, payload);
      } else {
        await apiClient.post('clients/', payload);
      }
      setModalClient(null);
      refetch();
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Ошибка');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitError('');
    try {
      await apiClient.delete(`clients/${deleteTarget.id}/`);
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      const data = err.response?.data;
      setSubmitError(data?.code ? `[${data.code}] ${data.error || 'Ошибка удаления'}` : (data?.error || 'Ошибка удаления'));
    }
  };

  const handleOpenHistory = async (client) => {
    setHistoryTarget(client);
    setHistoryItems([]);
    setHistoryLoading(true);
    try {
      const res = await apiClient.get(`clients/${client.id}/history/`);
      setHistoryItems(res.data?.items || res.data?.results || []);
    } catch {
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="page page--clients">
      <h1 className="page__title">Клиенты</h1>

      <div className="orders-card">
        <div className="orders-card__head">
          <h2 className="orders-card__title">Список клиентов</h2>
          <div className="orders-card__actions">
            <input
              type="text"
              placeholder="Поиск..."
              value={queryState.search}
              onChange={(e) => setQueryState((p) => ({ ...p, search: e.target.value, page: 1 }))}
            />
            <button type="button" className="btn btn--primary" onClick={() => setModalClient({})}>
              Создать
            </button>
          </div>
        </div>

        {loading && <Loading />}
        {error && error.status !== 404 && <ErrorState error={error} onRetry={refetch} />}
        {!loading && (!error || error.status === 404) && items.length === 0 && <EmptyState title="Нет клиентов" />}
        {!loading && (!error || error.status === 404) && items.length > 0 && (
          <div className="orders-table orders-table--main">
            <div className="orders-table__header">
              <span className="orders-table__th">ИМЯ</span>
              <span className="orders-table__th">ТЕЛЕФОН</span>
              <span className="orders-table__th orders-table__th--actions">ДЕЙСТВИЯ</span>
            </div>
            {items.map((c) => (
              <div key={c.id} className="orders-table__row">
                <span>{c.name || c.title || `#${c.id}`}</span>
                <span>{c.phone || c.phone_number || '—'}</span>
                <div className="orders-table__actions">
                  <button type="button" className="btn btn--secondary btn--sm" onClick={() => setModalClient(c)}>
                    Редактировать
                  </button>
                  <button type="button" className="btn btn--sm" onClick={() => handleOpenHistory(c)}>
                    История
                  </button>
                  <button type="button" className="btn btn--danger btn--sm" onClick={() => setDeleteTarget({ id: c.id, name: c.name || `#${c.id}` })}>
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {submitError && <p className="modal__error">{submitError}</p>}
      </div>

      {modalClient !== null && (
        <ClientModal
          client={modalClient?.id ? modalClient : null}
          onClose={() => { setModalClient(null); setSubmitError(''); }}
          onSubmit={handleSubmit}
          error={submitError}
        />
      )}

      {historyTarget && (
        <HistoryModal
          client={historyTarget}
          loading={historyLoading}
          items={historyItems}
          onClose={() => setHistoryTarget(null)}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Удалить клиента?"
        message={deleteTarget ? `Удалить "${deleteTarget.name}"?` : ''}
        confirmText="Удалить"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

const ClientModal = ({ client, onClose, onSubmit, error }) => {
  const [name, setName] = useState(client?.name || '');
  const [phone, setPhone] = useState(client?.phone || client?.phone_number || '');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h3>{client ? 'Редактировать клиента' : 'Создать клиента'}</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Закрыть">×</button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              name: name.trim(),
              phone: phone.trim() || undefined,
            });
          }}
        >
          <label>Имя</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
          <label>Телефон</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          {error && <p className="modal__error">{error}</p>}
          <div className="modal__actions">
            <button type="submit" className="btn btn--primary">Сохранить</button>
            <button type="button" className="btn btn--secondary" onClick={onClose}>Отмена</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const HistoryModal = ({ client, loading, items, onClose }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
      <div className="modal__head">
        <h3>История клиента: {client?.name}</h3>
        <button type="button" className="modal__close" onClick={onClose} aria-label="Закрыть">×</button>
      </div>
      {loading && <Loading />}
      {!loading && items.length === 0 && <EmptyState title="История пустая" />}
      {!loading && items.length > 0 && (
        <div className="orders-table orders-table--main">
          <div className="orders-table__header">
            <span className="orders-table__th">ДАТА</span>
            <span className="orders-table__th">ТИП</span>
            <span className="orders-table__th">ОПИСАНИЕ</span>
          </div>
          {items.map((h, idx) => (
            <div key={h.id || idx} className="orders-table__row">
              <span>{h.date || h.created_at || '—'}</span>
              <span>{h.type || h.event || '—'}</span>
              <span>{h.description || h.comment || JSON.stringify(h)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

export default ClientsPage;
