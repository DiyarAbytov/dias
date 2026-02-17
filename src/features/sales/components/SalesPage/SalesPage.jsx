import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useServerQuery } from '../../../../shared/lib';
import { ConfirmModal, EmptyState, ErrorState, Loading } from '../../../../shared/ui';
import { apiClient } from '../../../../shared/api';

const SalesPage = () => {
  const [queryState] = useState({ page: 1, page_size: 20 });
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [modalSale, setModalSale] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitError, setSubmitError] = useState('');

  const { items, loading, error, refetch } = useServerQuery('sales/', queryState, { enabled: true });

  useEffect(() => {
    apiClient.get('clients/', { params: { page_size: 500 } })
      .then((res) => setClients(res.data?.items || []))
      .catch(() => setClients([]));
    apiClient.get('warehouse/batches/', { params: { page_size: 500, status: 'available' } })
      .then((res) => setProducts(res.data?.items || []))
      .catch(() => setProducts([]));
  }, []);

  const handleSubmit = async (payload) => {
    setSubmitError('');
    try {
      console.log('Отправка данных продажи:', payload);
      if (modalSale?.id) {
        await apiClient.patch(`sales/${modalSale.id}/`, payload);
      } else {
        await apiClient.post('sales/', payload);
      }
      setModalSale(null);
      refetch();
    } catch (err) {
      console.error('Ошибка создания продажи:', err.response?.data);
      const data = err.response?.data;
      const base = data?.error || 'Ошибка';
      const details = data?.details && typeof data.details === 'object'
        ? Object.entries(data.details).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('; ')
        : '';
      setSubmitError([base, details].filter(Boolean).join('. '));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitError('');
    try {
      await apiClient.delete(`sales/${deleteTarget.id}/`);
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Ошибка удаления');
    }
  };

  return (
    <div className="page page--sales">
      <h1 className="page__title">Продажи</h1>
      <div className="orders-nav">
        <span className="orders-nav__current">Продажи</span>
        <span className="orders-nav__sep">→</span>
        <Link to="/shipments" className="orders-nav__link">Отгрузки</Link>
      </div>

      <div className="orders-card">
        <div className="orders-card__head">
          <h2 className="orders-card__title">Список продаж</h2>
          <button type="button" className="btn btn--primary" onClick={() => setModalSale({})}>
            Создать
          </button>
        </div>

        {loading && <Loading />}
        {error && error.status !== 404 && <ErrorState error={error} onRetry={refetch} />}
        {!loading && (!error || error.status === 404) && items.length === 0 && <EmptyState title="Нет продаж" />}
        {!loading && (!error || error.status === 404) && items.length > 0 && (
          <div className="orders-table orders-table--main">
            <div className="orders-table__header">
              <span className="orders-table__th">КЛИЕНТ</span>
              <span className="orders-table__th">ПРОДУКТ</span>
              <span className="orders-table__th">КОЛ-ВО</span>
              <span className="orders-table__th">ЦЕНА</span>
              <span className="orders-table__th orders-table__th--actions">ДЕЙСТВИЯ</span>
            </div>
            {items.map((s) => (
              <div key={s.id} className="orders-table__row">
                <span>{s.client_name || s.client?.name || s.client || '—'}</span>
                <span>{s.product_name || s.product?.name || s.product || '—'}</span>
                <span>{s.quantity ?? '—'}</span>
                <span>{s.price ?? s.total ?? '—'}</span>
                <div className="orders-table__actions">
                  <button type="button" className="btn btn--secondary btn--sm" onClick={() => setModalSale(s)}>
                    Редактировать
                  </button>
                  <button type="button" className="btn btn--danger btn--sm" onClick={() => setDeleteTarget({ id: s.id, name: s.product_name || s.product || `#${s.id}` })}>
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {submitError && <p className="modal__error">{submitError}</p>}
      </div>

      {modalSale !== null && (
        <SaleModal
          sale={modalSale?.id ? modalSale : null}
          clients={clients}
          products={products}
          onSubmit={handleSubmit}
          onClose={() => { setModalSale(null); setSubmitError(''); }}
          error={submitError}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Удалить продажу?"
        message={deleteTarget ? `Удалить "${deleteTarget.name}"?` : ''}
        confirmText="Удалить"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

const SaleModal = ({ sale, clients, products, onSubmit, onClose, error }) => {
  const [client, setClient] = useState(sale?.client_id ?? sale?.client?.id ?? sale?.client ?? '');
  const [product, setProduct] = useState(sale?.product_id ?? sale?.product?.id ?? sale?.product ?? '');
  const [quantity, setQuantity] = useState(sale?.quantity ?? '');
  const [price, setPrice] = useState(sale?.price ?? '');
  const [comment, setComment] = useState(sale?.comment ?? '');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h3>{sale ? 'Редактировать продажу' : 'Создать продажу'}</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Закрыть">×</button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              client: client ? Number(client) : undefined,
              product: product ? Number(product) : undefined,
              quantity: quantity ? Number(quantity) : undefined,
              price: price ? Number(price) : undefined,
              comment: comment.trim() || undefined,
            });
          }}
        >
          <label>Клиент</label>
          <select value={client} onChange={(e) => setClient(e.target.value)} required>
            <option value="">— Выберите —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name || `#${c.id}`}</option>
            ))}
          </select>
          <label>Продукт (Склад ГП)</label>
          <select value={product} onChange={(e) => setProduct(e.target.value)} required>
            <option value="">— Выберите —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.product_name || p.product?.name || p.product || `#${p.id}`} - {p.quantity ?? p.available_quantity ?? 0} шт
              </option>
            ))}
          </select>
          <label>Количество</label>
          <input type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          <label>Цена</label>
          <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          <label>Комментарий</label>
          <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Опционально" />
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

export default SalesPage;
