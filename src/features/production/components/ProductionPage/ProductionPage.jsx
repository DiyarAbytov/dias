import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loading, EmptyState, ErrorState } from '../../../../shared/ui';
import { getBatches, getOrdersInProgress, releaseOrder } from '../../api/productionApi';
import './ProductionPage.scss';

const batchListFromRes = (res) => res?.data?.items ?? res?.data?.results ?? [];
const errorToMessage = (err) => {
  const data = err?.response?.data;
  if (!data || typeof data !== 'object') return err?.message || 'Ошибка';
  const code = data.code ? `[${data.code}] ` : '';
  const base = data.error || data.message || 'Ошибка';
  const details = data.details && typeof data.details === 'object'
    ? Object.entries(data.details).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('; ')
    : '';
  const missing = Array.isArray(data.missing) && data.missing.length
    ? data.missing.map((m) => {
      if (typeof m === 'object') {
        const name = m.component || m.raw_material || m.element || m.name || 'компонент';
        const req = m.required ?? m.need ?? '?';
        const avail = m.available ?? m.balance ?? 0;
        const unit = m.unit || '';
        return `${name}: нужно ${req} ${unit}, доступно ${avail} ${unit}`.trim();
      }
      return String(m);
    }).join('; ')
    : '';
  return [code + base, details, missing].filter(Boolean).join('. ');
};

const ProductionPage = () => {
  const [releaseModalOpen, setReleaseModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(null);

  const releasableOrders = orders.filter((o) => {
    const s = String(o.status || '').toLowerCase();
    return s === 'created' || s === 'in_progress' || s === 'создан' || s === 'в работе';
  });

  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(true);

  useEffect(() => {
    const loadInitial = async () => {
      setOrdersLoading(true);
      setOrdersError(null);
      setBatchesLoading(true);
      try {
        const [ordersRes, batchesRes] = await Promise.all([
          getOrdersInProgress({ page_size: 50 }),
          getBatches({ page_size: 50 }),
        ]);
        setOrders(batchListFromRes(ordersRes));
        setBatches(batchListFromRes(batchesRes));
      } catch (err) {
        if (err?.response?.status !== 404) setOrdersError(err?.response?.data || { error: err?.message });
        setOrders([]);
        setBatches([]);
      } finally {
        setOrdersLoading(false);
        setBatchesLoading(false);
      }
    };
    loadInitial();
  }, []);

  const productName = (o) => o.product_name || o.product?.name || o.product || o.recipe?.name || o.recipe_name || '—';
  const lineName = (o) => o.line?.name || o.line_name || o.line || '—';
  const statusLabel = (s) => {
    const v = String(s || '').toLowerCase();
    if (v === 'created' || v === 'создан') return 'СОЗДАН';
    if (v === 'in_progress' || v === 'в работе') return 'В РАБОТЕ';
    if (v === 'done' || v === 'выполнен') return 'ВЫПОЛНЕН';
    return s || '—';
  };
  const otkStatusLabel = (s) => {
    const v = String(s || '').toLowerCase();
    if (v === 'pending' || v === 'ожидает') return 'ОЖИДАЕТ';
    if (v === 'accepted' || v === 'принято') return 'ПРИНЯТО';
    if (v === 'rejected' || v === 'брак') return 'БРАК';
    return s || '—';
  };
  const formatDate = (d) => (d ? (typeof d === 'string' ? d.slice(0, 10) : d) : '—');

  const refetch = () => {
    setOrdersLoading(true);
    setOrdersError(null);
    setBatchesLoading(true);
    Promise.all([
      getOrdersInProgress({ page_size: 50 }),
      getBatches({ page_size: 50 }),
    ])
      .then(([ordersRes, batchesRes]) => {
        setOrders(batchListFromRes(ordersRes));
        setBatches(batchListFromRes(batchesRes));
      })
      .catch((err) => {
        if (err?.response?.status !== 404) setOrdersError(err?.response?.data || { error: err?.message });
        setOrders([]);
        setBatches([]);
      })
      .finally(() => {
        setOrdersLoading(false);
        setBatchesLoading(false);
      });
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
        {ordersError && ordersError.status !== 404 && <ErrorState error={ordersError} onRetry={refetch} />}
        {!ordersLoading && (!ordersError || ordersError.status === 404) && (
          releasableOrders.length === 0 ? (
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
              {releasableOrders.map((o) => (
                <div key={o.id} className="production-table__row">
                  <span>{productName(o)}</span>
                  <span>{lineName(o)}</span>
                  <span>{o.quantity ?? o.released ?? o.produced ?? '—'}</span>
                  <span>{statusLabel(o.status)}</span>
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
                  <span>{otkStatusLabel(b.otk_status || b.status)}</span>
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
          orders={releasableOrders}
          onSubmit={async (data) => {
            setSubmitError('');
            try {
              await releaseOrder(data.order_id, { quantity: data.quantity });
              setReleaseModalOpen(false);
              refetch();
            } catch (err) {
              setSubmitError(errorToMessage(err));
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
