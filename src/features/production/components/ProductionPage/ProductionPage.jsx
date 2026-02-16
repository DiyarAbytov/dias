import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useServerQuery } from '../../../../shared/lib';
import { Loading, EmptyState, ErrorState } from '../../../../shared/ui';
import { getOrdersInProgress, getBatches, releaseOrder } from '../../api/productionApi';
import { apiClient } from '../../../../shared/api';
import './ProductionPage.scss';

const ProductionPage = () => {
  const [releaseModalOpen, setReleaseModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const { items: orders, loading: ordersLoading, error: ordersError, refetch: refetchOrders } = useServerQuery(
    'orders/',
    { status: 'in_progress', page_size: 50 },
    { enabled: true }
  );

  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(true);

  useEffect(() => {
    setBatchesLoading(true);
    apiClient.get('batches/', { params: { page_size: 50 } })
      .then((res) => setBatches(res.data?.items || []))
      .catch(() => setBatches([]))
      .finally(() => setBatchesLoading(false));
  }, []);

  const productName = (o) => o.product_name || o.product?.name || o.product || o.recipe?.name || o.recipe_name || '—';
  const lineName = (o) => o.line?.name || o.line_name || o.line || '—';
  const formatDate = (d) => (d ? (typeof d === 'string' ? d.slice(0, 10) : d) : '—');

  const refetch = () => {
    refetchOrders();
    apiClient.get('batches/', { params: { page_size: 50 } })
      .then((res) => setBatches(res.data?.items || []))
      .catch(() => setBatches([]));
  };

  return (
    <div className="page page--production">
      <h1 className="page__title">Производство</h1>
      <div className="production-banner">
        При выпуске происходит списание со складов. После выпуска подтвердите — партия передаётся в ОТК.
      </div>
      <div className="production-nav">
        <Link to="/orders" className="production-nav__link">Заказы</Link>
        <span className="production-nav__sep">→</span>
        <Link to="/otk" className="production-nav__link">ОТК</Link>
      </div>

      <div className="production-card">
        <div className="production-card__head">
          <h2 className="production-card__title">Заказы</h2>
          <button type="button" className="btn btn--primary" onClick={() => setReleaseModalOpen(true)}>
            Выпустить
          </button>
        </div>
        {ordersLoading && <Loading />}
        {ordersError && ordersError.status !== 404 && <ErrorState error={ordersError} onRetry={refetchOrders} />}
        {!ordersLoading && (!ordersError || ordersError.status === 404) && (
          orders.length === 0 ? (
            <EmptyState title="Нет заказов для выпуска" />
          ) : (
            <div className="production-table production-table--orders">
              <div className="production-table__header">
                <span className="production-table__th">ПРОДУКТ</span>
                <span className="production-table__th">ЛИНИЯ</span>
                <span className="production-table__th">ВЫПУЩЕНО</span>
                <span className="production-table__th">СТАТУС</span>
                <span className="production-table__th production-table__th--actions">ДЕЙСТВИЯ</span>
              </div>
              {orders.map((o) => (
                <div key={o.id} className="production-table__row">
                  <span>{productName(o)}</span>
                  <span>{lineName(o)}</span>
                  <span>{o.quantity ?? o.released ?? o.produced ?? '—'}</span>
                  <span>{productName(o)}</span>
                  <div className="production-table__actions">
                    <button type="button" className="btn btn--secondary btn--sm">Редактировать</button>
                    <button type="button" className="btn btn--danger btn--sm">Удалить</button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <div className="production-card">
        <div className="production-card__head">
          <h2 className="production-card__title">Партии</h2>
        </div>
        {batchesLoading && <Loading />}
        {!batchesLoading && (
          batches.length === 0 ? (
            <EmptyState title="Нет партий" />
          ) : (
            <div className="production-table production-table--batches">
              <div className="production-table__header">
                <span className="production-table__th">СТАТУС ОТК</span>
                <span className="production-table__th">ПРОДУКТ</span>
                <span className="production-table__th">ВЫПУЩЕНО</span>
                <span className="production-table__th">ОПЕРАТОР</span>
                <span className="production-table__th">ДАТА</span>
              </div>
              {batches.map((b) => (
                <div key={b.id} className="production-table__row">
                  <span>{b.otk_status || b.status || '—'}</span>
                  <span>{b.product_name || b.product?.name || b.product || '—'}</span>
                  <span>{b.quantity ?? b.released ?? '—'}</span>
                  <span>{b.operator_name || b.operator?.name || b.operator || b.assigned_to || '—'}</span>
                  <span>{formatDate(b.date || b.created_at)}</span>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {releaseModalOpen && (
        <ReleaseModal
          orders={orders}
          onSubmit={async (data) => {
            setSubmitError('');
            try {
              await releaseOrder(data.order_id, { quantity: data.quantity });
              setReleaseModalOpen(false);
              refetch();
            } catch (err) {
              setSubmitError(err.response?.data?.error || err.response?.data?.details || 'Ошибка');
            }
          }}
          onClose={() => { setReleaseModalOpen(false); setSubmitError(''); }}
          error={submitError}
        />
      )}
    </div>
  );
};

const ReleaseModal = ({ orders, onSubmit, onClose, error }) => {
  const [orderId, setOrderId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [writeOffRows, setWriteOffRows] = useState([]);

  const selectedOrder = orderId ? orders.find((o) => String(o.id) === String(orderId)) : null;

  useEffect(() => {
    if (!selectedOrder) {
      setWriteOffRows([]);
      return;
    }
    const comp = selectedOrder.components || selectedOrder.recipe?.components || [];
    setWriteOffRows(Array.isArray(comp) ? comp.map((c) => ({
      component: c.material_name || c.element_name || c.name || '—',
      required: c.quantity ?? '—',
      where: '—',
      batch: '—',
      balance: '—',
      status: '—',
    })) : []);
  }, [selectedOrder]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!orderId || !quantity) return;
    onSubmit({ order_id: Number(orderId), quantity: Number(quantity) });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h3>Выпустить</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Закрыть">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <label>Заказ</label>
          <select value={orderId} onChange={(e) => setOrderId(e.target.value)} required>
            <option value="">— Выберите —</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.product_name || o.product?.name || o.product || o.recipe_name || o.recipe?.name || `Заказ #${o.id}`}
              </option>
            ))}
          </select>
          <div className="production-modal-banner">
            Доступны только подтверждённые заказы для линий с открытыми сменами.
          </div>
          <label>Кол-во, шт</label>
          <input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
          <label>Списание</label>
          <div className="production-modal-banner production-modal-banner--small">
            Списание происходит автоматически.
          </div>
          {writeOffRows.length > 0 ? (
            <div className="production-writeoff-table">
              <div className="production-writeoff-table__header">
                <span>КОМПОНЕНТ</span>
                <span>ТРЕБУЕТС</span>
                <span>КУДА</span>
                <span>ПАРТИЯ</span>
                <span>ОСТАТОК</span>
                <span>СТАТУС</span>
              </div>
              {writeOffRows.map((row, i) => (
                <div key={i} className="production-writeoff-table__row">
                  <span>{row.component}</span>
                  <span>{row.required}</span>
                  <span>{row.where}</span>
                  <span>{row.batch}</span>
                  <span>{row.balance}</span>
                  <span>{row.status}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="production-modal-warning">
            Проверьте остатки.
          </div>
          {error && <p className="modal__error">{error}</p>}
          <div className="modal__actions">
            <button type="submit" className="btn btn--primary">Выпустить</button>
            <button type="button" className="btn btn--secondary" onClick={onClose}>Отмена</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductionPage;
