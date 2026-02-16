import React, { useMemo, useState } from 'react';
import { useServerQuery } from '../../../../shared/lib';
import { EmptyState, ErrorState, Loading } from '../../../../shared/ui';
import { apiClient } from '../../../../shared/api';

const statusLabel = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'available') return 'Доступна';
  if (s === 'reserved') return 'В резерве';
  if (s === 'shipped') return 'Отгружена';
  return status || '—';
};

const WarehousePage = () => {
  const [queryState, setQueryState] = useState({ page: 1, page_size: 20, status: '' });
  const [reserveTarget, setReserveTarget] = useState(null);
  const [submitError, setSubmitError] = useState('');

  const { items, loading, error, refetch } = useServerQuery('warehouse/batches/', queryState, { enabled: true });

  const rows = useMemo(() => items || [], [items]);

  const handleReserve = async (batchId, quantity) => {
    setSubmitError('');
    try {
      await apiClient.post('warehouse/batches/reserve/', {
        batchId: Number(batchId),
        quantity: Number(quantity),
      });
      setReserveTarget(null);
      refetch();
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.code ? `[${data.code}] ${data.error || 'Ошибка'}` : (data?.error || 'Ошибка');
      setSubmitError(msg);
    }
  };

  return (
    <div className="page page--warehouse">
      <h1 className="page__title">Склад ГП</h1>

      <div className="production-card">
        <div className="production-card__head">
          <h2 className="production-card__title">Партии</h2>
          <select
            value={queryState.status}
            onChange={(e) => setQueryState((p) => ({ ...p, status: e.target.value, page: 1 }))}
          >
            <option value="">Все статусы</option>
            <option value="available">Доступна</option>
            <option value="reserved">В резерве</option>
            <option value="shipped">Отгружена</option>
          </select>
        </div>

        {loading && <Loading />}
        {error && error.status !== 404 && <ErrorState error={error} onRetry={refetch} />}
        {!loading && (!error || error.status === 404) && rows.length === 0 && (
          <EmptyState title="Нет партий на складе ГП" />
        )}
        {!loading && (!error || error.status === 404) && rows.length > 0 && (
          <div className="production-table production-table--batches">
            <div className="production-table__header">
              <span className="production-table__th">СТАТУС</span>
              <span className="production-table__th">ПРОДУКТ</span>
              <span className="production-table__th">КОЛ-ВО</span>
              <span className="production-table__th">ПАРТИЯ</span>
              <span className="production-table__th production-table__th--actions">ДЕЙСТВИЯ</span>
            </div>
            {rows.map((b) => {
              const qty = b.quantity ?? b.available_quantity ?? 0;
              const canReserve = String(b.status || '').toLowerCase() === 'available';
              return (
                <div key={b.id} className="production-table__row">
                  <span>{statusLabel(b.status)}</span>
                  <span>{b.product_name || b.product?.name || b.product || '—'}</span>
                  <span>{qty}</span>
                  <span>{b.batch || b.lot || `#${b.id}`}</span>
                  <div className="production-table__actions">
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      disabled={!canReserve}
                      onClick={() => setReserveTarget({ id: b.id, quantity: qty, product: b.product_name || b.product || `#${b.id}` })}
                    >
                      Резерв
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {reserveTarget && (
        <ReserveModal
          batch={reserveTarget}
          onClose={() => { setReserveTarget(null); setSubmitError(''); }}
          onSubmit={handleReserve}
          error={submitError}
        />
      )}
    </div>
  );
};

const ReserveModal = ({ batch, onClose, onSubmit, error }) => {
  const [quantity, setQuantity] = useState(batch?.quantity ? String(batch.quantity) : '1');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h3>Резерв партии</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Закрыть">×</button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(batch.id, Number(quantity));
          }}
        >
          <label>Продукт</label>
          <input value={batch.product} readOnly />
          <label>Количество</label>
          <input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
          {error && <p className="modal__error">{error}</p>}
          <div className="modal__actions">
            <button type="submit" className="btn btn--primary">Зарезервировать</button>
            <button type="button" className="btn btn--secondary" onClick={onClose}>Отмена</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WarehousePage;
