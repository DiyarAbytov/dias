import React, { useState, useEffect } from 'react';
import { useServerQuery } from '../../../../shared/lib';
import { Loading, EmptyState, ErrorState, ConfirmModal, useToast } from '../../../../shared/ui';
import {
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
  createIncoming,
  updateIncoming,
  deleteIncoming,
} from '../../api/materialsApi';
import { apiClient } from '../../../../shared/api';
import './MaterialsPage.scss';

const UNITS = [
  { value: 'кг', label: 'КГ' },
  { value: 'л', label: 'Л' },
  { value: 'г', label: 'Г' },
  { value: 'мл', label: 'МЛ' },
];

const MaterialsPage = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('directory');
  const [dirQuery, setDirQuery] = useState({ page: 1, page_size: 20, search: '' });
  const [incomingQuery, setIncomingQuery] = useState({ page: 1, page_size: 20, search: '' });
  const [dirModal, setDirModal] = useState(null);
  const [incomingModal, setIncomingModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitError, setSubmitError] = useState('');

  const { items: rawMaterials, loading: dirLoading, error: dirError, refetch: refetchDir } = useServerQuery(
    'raw-materials/',
    activeTab === 'directory' ? dirQuery : activeTab === 'incoming' ? { page_size: 500 } : { page_size: 1 },
    { enabled: activeTab === 'directory' || activeTab === 'incoming' }
  );

  const { items: incomingList, loading: incLoading, error: incError, refetch: refetchIncoming } = useServerQuery(
    'incoming/',
    activeTab === 'incoming' ? incomingQuery : { page_size: 1 },
    { enabled: activeTab === 'incoming' }
  );

  const [balances, setBalances] = useState([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesSearch, setBalancesSearch] = useState('');

  useEffect(() => {
    if (activeTab !== 'balances') return;
    setBalancesLoading(true);
    apiClient.get('materials/balances/').then((res) => {
      setBalances(res.data?.items || []);
    }).catch(() => setBalances([])).finally(() => setBalancesLoading(false));
  }, [activeTab]);

  const balancesFiltered = balancesSearch.trim()
    ? balances.filter((b) => b.material_name?.toLowerCase().includes(balancesSearch.trim().toLowerCase()))
    : balances;

  const handleDirSubmit = async (data) => {
    setSubmitError('');
    try {
      if (dirModal?.id) {
        await updateRawMaterial(dirModal.id, data);
      } else {
        await createRawMaterial(data);
      }
      setDirModal(null);
      refetchDir();
      toast.show('Успешно сохранено');
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Ошибка');
    }
  };

  const handleIncomingSubmit = async (data) => {
    setSubmitError('');
    try {
      if (incomingModal?.id) {
        await updateIncoming(incomingModal.id, data);
      } else {
        await createIncoming(data);
      }
      setIncomingModal(null);
      refetchIncoming();
      refetchDir();
      toast.show('Успешно сохранено');
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Ошибка');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitError('');
    try {
      if (deleteTarget.type === 'dir') {
        await deleteRawMaterial(deleteTarget.id);
        refetchDir();
      } else {
        await deleteIncoming(deleteTarget.id);
        refetchIncoming();
      }
      setDeleteTarget(null);
      toast.show('Успешно удалено');
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Ошибка удаления');
    }
  };

  const formatDate = (d) => (d ? (typeof d === 'string' ? d.slice(0, 10) : d) : '—');

  return (
    <div className="page page--materials">
      <h1 className="page__title">Склад сырья</h1>
      <div className="materials-tabs">
        <button
          type="button"
          className={`materials-tabs__tab ${activeTab === 'directory' ? 'materials-tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('directory')}
        >
          Справочник
        </button>
        <button
          type="button"
          className={`materials-tabs__tab ${activeTab === 'incoming' ? 'materials-tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('incoming')}
        >
          Приход
        </button>
        <button
          type="button"
          className={`materials-tabs__tab ${activeTab === 'balances' ? 'materials-tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('balances')}
        >
          Остатки
        </button>
      </div>

      {activeTab === 'directory' && (
        <div className="materials-card">
          <div className="materials-card__head">
            <h2 className="materials-card__title">Справочник</h2>
            <div className="materials-card__actions">
              <input
                type="text"
                className="materials-card__search"
                placeholder="Поиск..."
                value={dirQuery.search || ''}
                onChange={(e) => setDirQuery((p) => ({ ...p, search: e.target.value, page: 1 }))}
              />
              <button type="button" className="btn btn--primary" onClick={() => setDirModal({})}>
                Добавить
              </button>
            </div>
          </div>
          {dirLoading && <Loading />}
          {dirError && <ErrorState error={dirError} onRetry={refetchDir} />}
          {!dirLoading && !dirError && (
            rawMaterials.length === 0 ? (
              <EmptyState title="Нет данных" />
            ) : (
              <div className="materials-table">
                <div className="materials-table__header">
                  <span className="materials-table__th">НАЗВАНИЕ</span>
                  <span className="materials-table__th">ЕД.</span>
                  <span className="materials-table__th materials-table__th--actions">ДЕЙСТВИЯ</span>
                </div>
                {rawMaterials.map((r) => (
                  <div key={r.id} className="materials-table__row">
                    <span className="materials-table__name">{r.name}</span>
                    <span className="materials-table__unit">{r.unit || 'кг'}</span>
                    <div className="materials-table__actions">
                      <button type="button" className="btn btn--secondary btn--sm" onClick={() => setDirModal(r)}>
                        Редактировать
                      </button>
                      <button type="button" className="btn btn--danger btn--sm" onClick={() => setDeleteTarget({ type: 'dir', id: r.id, name: r.name })}>
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {activeTab === 'incoming' && (
        <div className="materials-card">
          <div className="materials-card__head">
            <h2 className="materials-card__title">Приход</h2>
            <div className="materials-card__actions">
              <input
                type="text"
                className="materials-card__search"
                placeholder="Поиск..."
                value={incomingQuery.search || ''}
                onChange={(e) => setIncomingQuery((p) => ({ ...p, search: e.target.value, page: 1 }))}
              />
              <button type="button" className="btn btn--primary" onClick={() => setIncomingModal({})}>
                Добавить
              </button>
            </div>
          </div>
          {incLoading && <Loading />}
          {incError && <ErrorState error={incError} onRetry={refetchIncoming} />}
          {!incLoading && !incError && (
            incomingList.length === 0 ? (
              <EmptyState title="Нет данных" />
            ) : (
              <div className="materials-table materials-table--incoming">
                <div className="materials-table__header">
                  <span className="materials-table__th">ДАТА</span>
                  <span className="materials-table__th">СЫРЬЁ</span>
                  <span className="materials-table__th">КОЛИЧЕСТВО</span>
                  <span className="materials-table__th">ПАРТИЯ</span>
                  <span className="materials-table__th">ПОСТАВЩИК</span>
                  <span className="materials-table__th">КОММЕНТАРИЙ</span>
                  <span className="materials-table__th materials-table__th--actions">ДЕЙСТВИЯ</span>
                </div>
                {incomingList.map((i) => (
                  <div key={i.id} className="materials-table__row">
                    <span className="materials-table__date">{formatDate(i.date)}</span>
                    <span className="materials-table__name">{i.material_name || i.material}</span>
                    <span>{i.quantity} {i.unit || 'кг'}</span>
                    <span>{i.batch || '—'}</span>
                    <span>{i.supplier || '—'}</span>
                    <span>{i.comment || '—'}</span>
                    <div className="materials-table__actions">
                      <button type="button" className="btn btn--secondary btn--sm" onClick={() => setIncomingModal(i)}>
                        Редактировать
                      </button>
                      <button type="button" className="btn btn--danger btn--sm" onClick={() => setDeleteTarget({ type: 'incoming', id: i.id, name: `${i.material_name || i.material} ${formatDate(i.date)}` })}>
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {activeTab === 'balances' && (
        <div className="materials-card">
          <div className="materials-card__head">
            <h2 className="materials-card__title">Остатки</h2>
            <input
              type="text"
              className="materials-card__search"
              placeholder="Поиск..."
              value={balancesSearch}
              onChange={(e) => setBalancesSearch(e.target.value)}
            />
          </div>
          {balancesLoading && <Loading />}
          {!balancesLoading && (
            balancesFiltered.length === 0 ? (
              <EmptyState title="Нет данных" />
            ) : (
              <div className="materials-table materials-table--balances">
                <div className="materials-table__header">
                  <span className="materials-table__th">СЫРЬЁ</span>
                  <span className="materials-table__th">ОСТАТОК</span>
                </div>
                {balancesFiltered.map((b) => (
                  <div key={b.material_id} className="materials-table__row">
                    <span className="materials-table__name">{b.material_name}</span>
                    <span>{b.balance} {b.unit || 'кг'}</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {dirModal !== null && (
        <DirModal
          item={dirModal?.id ? dirModal : null}
          units={UNITS}
          onSubmit={handleDirSubmit}
          onClose={() => { setDirModal(null); setSubmitError(''); }}
          error={submitError}
        />
      )}

      {incomingModal && (
        <IncomingModal
          rawMaterials={rawMaterials}
          onSubmit={handleIncomingSubmit}
          onClose={() => { setIncomingModal(false); setSubmitError(''); }}
          error={submitError}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Удалить?"
        message={deleteTarget ? `Удалить "${deleteTarget.name}"?` : ''}
        confirmText="Удалить"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

const DirModal = ({ item, units, onSubmit, onClose, error }) => {
  const isEdit = !!item?.id;
  const [name, setName] = useState(item?.name ?? '');
  const [unit, setUnit] = useState(item?.unit ?? 'кг');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h3>{isEdit ? 'Редактировать' : 'Добавить'}</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Закрыть">×</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name, unit: unit || undefined }); }}>
          <label>Название</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Название" />
          <label>Ед.</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            {units.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
          {error && <p className="modal__error">{error}</p>}
          <div className="modal__actions">
            <button type="submit" className="btn btn--primary">{isEdit ? 'Сохранить' : 'Добавить'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const IncomingModal = ({ incoming, rawMaterials, onSubmit, onClose, error }) => {
  const [date, setDate] = useState(incoming?.date ?? new Date().toISOString().slice(0, 10));
  const [material, setMaterial] = useState(incoming?.material != null ? String(incoming.material) : '');
  const [quantity, setQuantity] = useState(incoming?.quantity ?? '');
  const [batch, setBatch] = useState(incoming?.batch ?? '');
  const [supplier, setSupplier] = useState(incoming?.supplier ?? '');
  const [comment, setComment] = useState(incoming?.comment ?? '');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h3>{incoming?.id ? 'Редактировать приход' : 'Добавить приход'}</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Закрыть">×</button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const qty = Number(quantity);
            if (qty <= 0) return;
            onSubmit({
              date,
              material: Number(material),
              quantity: qty,
              batch: batch || undefined,
              supplier: supplier || undefined,
              comment: comment || undefined,
            });
          }}
        >
          <label>Дата прихода</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <label>Сырьё</label>
          <select value={material} onChange={(e) => setMaterial(e.target.value)} required>
            <option value="">—</option>
            {rawMaterials.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <label>Количество</label>
          <input type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          <label>Партия</label>
          <input value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="LOT-2024-001" />
          <label>Поставщик</label>
          <input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          <label>Комментарий</label>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
          {error && <p className="modal__error">{error}</p>}
          <div className="modal__actions">
            <button type="submit" className="btn btn--primary">{incoming?.id ? 'Сохранить' : 'Добавить'}</button>
            <button type="button" className="btn btn--secondary" onClick={onClose}>Отмена</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaterialsPage;
