import React, { useState, useEffect } from 'react';
import { useServerQuery } from '../../../../shared/lib';
import { Loading, EmptyState, ErrorState, ConfirmModal } from '../../../../shared/ui';
import {
  createChemicalElement,
  updateChemicalElement,
  deleteChemicalElement,
  createChemistryTask,
  deleteChemistryTask,
  confirmChemistryTask,
} from '../../api/chemistryApi';
import { apiClient } from '../../../../shared/api';
import './ChemistryPage.scss';

const UNITS = [
  { value: 'кг', label: 'кг' },
  { value: 'л', label: 'л' },
  { value: 'г', label: 'г' },
  { value: 'мл', label: 'мл' },
];

const ChemistryPage = () => {
  const [activeTab, setActiveTab] = useState('plan');
  const [dirQuery, setDirQuery] = useState({ page: 1, page_size: 20, search: '' });
  const [planQuery, setPlanQuery] = useState({ page: 1, page_size: 20 });
  const [dirModal, setDirModal] = useState(null);
  const [planModal, setPlanModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitError, setSubmitError] = useState('');

  const { items: elements, loading: dirLoading, error: dirError, refetch: refetchDir } = useServerQuery(
    'chemistry/elements/',
    activeTab === 'directory' ? dirQuery : activeTab === 'plan' ? { page_size: 500 } : { page_size: 1 },
    { enabled: activeTab === 'directory' || activeTab === 'plan' }
  );

  const { items: tasks, loading: planLoading, error: planError, refetch: refetchPlan } = useServerQuery(
    'chemistry/tasks/',
    activeTab === 'plan' ? planQuery : { page_size: 1 },
    { enabled: activeTab === 'plan' }
  );

  const [balances, setBalances] = useState([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesSearch, setBalancesSearch] = useState('');

  useEffect(() => {
    if (activeTab !== 'balances') return;
    setBalancesLoading(true);
    apiClient.get('chemistry/balances/').then((res) => {
      setBalances(res.data?.items || []);
    }).catch(() => setBalances([])).finally(() => setBalancesLoading(false));
  }, [activeTab]);

  const balancesFiltered = balancesSearch.trim()
    ? balances.filter((b) => {
        const s = balancesSearch.trim().toLowerCase();
        return (b.element_name || b.chemical_element || '').toLowerCase().includes(s) ||
          (b.batch || '').toLowerCase().includes(s);
      })
    : balances;

  const chemistryApiError = (err) => {
    if (err.response?.status === 404) {
      return 'Сервис «Хим. элементы» пока не подключён. Добавьте на сервере эндпоинты: /api/chemistry/elements/, /api/chemistry/tasks/, /api/chemistry/balances/';
    }
    const data = err.response?.data;
    if (data && typeof data === 'object' && !data.error) {
      const parts = Object.entries(data).map(([k, v]) => {
        const msg = Array.isArray(v) ? v.map((e) => (e && typeof e === 'object' ? e.string : e)).join(', ') : String(v);
        return `${k}: ${msg}`;
      });
      return parts.join('; ');
    }
    return data?.error || 'Ошибка';
  };

  const handleDirSubmit = async (data) => {
    setSubmitError('');
    try {
      if (dirModal?.id) {
        await updateChemicalElement(dirModal.id, data);
      } else {
        await createChemicalElement(data);
      }
      setDirModal(null);
      refetchDir();
    } catch (err) {
      setSubmitError(chemistryApiError(err));
    }
  };

  const handlePlanSubmit = async (data) => {
    setSubmitError('');
    try {
      await createChemistryTask(data);
      setPlanModal(false);
      refetchPlan();
    } catch (err) {
      setSubmitError(chemistryApiError(err));
    }
  };

  const handleConfirmTask = async (id) => {
    setSubmitError('');
    try {
      await confirmChemistryTask(id);
      refetchPlan();
    } catch (err) {
      setSubmitError(chemistryApiError(err));
    }
  };

  const handleDeleteDir = async () => {
    if (!deleteTarget) return;
    setSubmitError('');
    try {
      await deleteChemicalElement(deleteTarget.id);
      setDeleteTarget(null);
      refetchDir();
    } catch (err) {
      setSubmitError(chemistryApiError(err) || 'Ошибка удаления');
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteTarget) return;
    setSubmitError('');
    try {
      await deleteChemistryTask(deleteTarget.id);
      setDeleteTarget(null);
      refetchPlan();
    } catch (err) {
      setSubmitError(chemistryApiError(err) || 'Ошибка удаления');
    }
  };

  const formatDate = (d) => (d ? (typeof d === 'string' ? d.slice(0, 10) : d) : '—');

  const renderTaskElements = (task) => {
    const comp = task.components || task.elements || [];
    if (Array.isArray(comp) && comp.length) {
      return comp.map((c) => `${c.element_name || c.name || '—'} — ${c.quantity} ${c.unit || 'кг'}`).join(', ');
    }
    return task.elements_display || '—';
  };

  const taskStatus = (task) => task.status === 'completed' || task.status === 'ВЫПОЛНЕНО' ? 'completed' : 'pending';

  return (
    <div className="page page--chemistry">
      <h1 className="page__title">Хим. элементы</h1>
      <div className="chemistry-tabs">
        <button
          type="button"
          className={`chemistry-tabs__tab ${activeTab === 'plan' ? 'chemistry-tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('plan')}
        >
          План
        </button>
        <button
          type="button"
          className={`chemistry-tabs__tab ${activeTab === 'directory' ? 'chemistry-tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('directory')}
        >
          Справочник
        </button>
        <button
          type="button"
          className={`chemistry-tabs__tab ${activeTab === 'balances' ? 'chemistry-tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('balances')}
        >
          Остатки
        </button>
      </div>

      {activeTab === 'plan' && (
        <>
          <div className="chemistry-banner">
            Подтвердите выполнение — элемент станет доступен в Рецептах.
          </div>
          <div className="chemistry-card">
            <div className="chemistry-card__head">
              <h2 className="chemistry-card__title">План</h2>
              <button type="button" className="btn btn--primary" onClick={() => setPlanModal(true)}>
                Добавить
              </button>
            </div>
            {planLoading && <Loading />}
            {planError && planError.status !== 404 && <ErrorState error={planError} onRetry={refetchPlan} />}
            {!planLoading && (!planError || planError.status === 404) && (
              tasks.length === 0 ? (
                <EmptyState title="Нет данных" />
              ) : (
                <div className="chemistry-table chemistry-table--plan">
                  <div className="chemistry-table__header">
                    <span className="chemistry-table__th">ЗАДАНИЕ</span>
                    <span className="chemistry-table__th">ХИМ. ЭЛЕМЕНТЫ</span>
                    <span className="chemistry-table__th">СРОК</span>
                    <span className="chemistry-table__th">СТАТУС</span>
                    <span className="chemistry-table__th chemistry-table__th--actions">ДЕЙСТВИЯ</span>
                  </div>
                  {tasks.map((t) => (
                    <div key={t.id} className="chemistry-table__row">
                      <span className="chemistry-table__name">{t.title || t.name || '—'}</span>
                      <span className="chemistry-table__elements">{renderTaskElements(t)}</span>
                      <span className="chemistry-table__date">{formatDate(t.deadline || t.term)}</span>
                      <span>
                        <span className={`chemistry-table__badge chemistry-table__badge--${taskStatus(t)}`}>
                          {taskStatus(t) === 'completed' ? 'ВЫПОЛНЕНО' : 'В РАБОТЕ'}
                        </span>
                      </span>
                      <div className="chemistry-table__actions">
                        {taskStatus(t) !== 'completed' && (
                          <button type="button" className="btn btn--success btn--sm" onClick={() => handleConfirmTask(t.id)}>
                            Подтвердить
                          </button>
                        )}
                        <button type="button" className="btn btn--danger btn--sm" onClick={() => setDeleteTarget({ id: t.id, name: t.title || t.name })}>
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </>
      )}

      {activeTab === 'directory' && (
        <div className="chemistry-card">
          <div className="chemistry-card__head">
            <h2 className="chemistry-card__title">Справочник</h2>
            <div className="chemistry-card__actions">
              <input
                type="text"
                className="chemistry-card__search"
                placeholder="Поиск..."
                value={dirQuery.search || ''}
                onChange={(e) => setDirQuery((p) => ({ ...p, search: e.target.value, page: 1 }))}
              />
              <button type="button" className="btn btn--primary" onClick={() => setDirModal({})}>
                Создать
              </button>
            </div>
          </div>
          {dirLoading && <Loading />}
          {dirError && dirError.status !== 404 && <ErrorState error={dirError} onRetry={refetchDir} />}
          {!dirLoading && (!dirError || dirError.status === 404) && (
            elements.length === 0 ? (
              <EmptyState title="Нет данных" />
            ) : (
              <div className="chemistry-table chemistry-table--directory">
                <div className="chemistry-table__header">
                  <span className="chemistry-table__th">НАЗВАНИЕ</span>
                  <span className="chemistry-table__th">ЕД.</span>
                  <span className="chemistry-table__th chemistry-table__th--actions">ДЕЙСТВИЯ</span>
                </div>
                {elements.map((el) => (
                  <div key={el.id} className="chemistry-table__row">
                    <span className="chemistry-table__name">{el.name}</span>
                    <span className="chemistry-table__unit">{el.unit || 'кг'}</span>
                    <div className="chemistry-table__actions">
                      <button type="button" className="btn btn--secondary btn--sm" onClick={() => setDirModal(el)}>
                        Редактировать
                      </button>
                      <button type="button" className="btn btn--danger btn--sm" onClick={() => setDeleteTarget({ id: el.id, name: el.name, type: 'element' })}>
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
        <div className="chemistry-card">
          <div className="chemistry-card__head">
            <h2 className="chemistry-card__title">Остатки</h2>
            <input
              type="text"
              className="chemistry-card__search"
              placeholder="По названию, партии"
              value={balancesSearch}
              onChange={(e) => setBalancesSearch(e.target.value)}
            />
          </div>
          {balancesLoading && <Loading />}
          {!balancesLoading && (
            balancesFiltered.length === 0 ? (
              <EmptyState title="Нет данных" />
            ) : (
              <div className="chemistry-table chemistry-table--balances">
                <div className="chemistry-table__header">
                  <span className="chemistry-table__th">ХИМ. ЭЛЕМЕНТ</span>
                  <span className="chemistry-table__th">ЕД.</span>
                  <span className="chemistry-table__th">ВСЕГО</span>
                  <span className="chemistry-table__th">ПАРТИЯ</span>
                  <span className="chemistry-table__th">В ПАРТИИ</span>
                  <span className="chemistry-table__th">ДАТА</span>
                </div>
                {balancesFiltered.map((b, idx) => (
                  <div key={b.id ?? idx} className="chemistry-table__row">
                    <span className="chemistry-table__name">{b.element_name || b.chemical_element || b.name || '—'}</span>
                    <span>{b.unit || '—'}</span>
                    <span>{b.total ?? b.balance ?? '—'}</span>
                    <span>{b.batch || '—'}</span>
                    <span>{b.in_batch ?? '—'}</span>
                    <span className="chemistry-table__date">{formatDate(b.date)}</span>
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
          onSubmit={handleDirSubmit}
          onClose={() => { setDirModal(null); setSubmitError(''); }}
          error={submitError}
        />
      )}

      {planModal && (
        <PlanModal
          elements={elements}
          onSubmit={handlePlanSubmit}
          onClose={() => { setPlanModal(false); setSubmitError(''); }}
          error={submitError}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Удалить?"
        message={deleteTarget ? `Удалить "${deleteTarget.name}"?` : ''}
        confirmText="Удалить"
        onConfirm={deleteTarget?.type === 'element' ? handleDeleteDir : handleDeleteTask}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

const DirModal = ({ item, onSubmit, onClose, error }) => {
  const isEdit = !!item?.id;
  const [name, setName] = useState(item?.name ?? '');
  const [unit, setUnit] = useState(item?.unit ?? 'кг');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h3>{isEdit ? 'Редактировать' : 'Создать'}</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Закрыть">×</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name, unit: unit || undefined }); }}>
          <label>Название</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Название" />
          <label>Ед.</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            {UNITS.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
          {error && <p className="modal__error">{error}</p>}
          <div className="modal__actions">
            <button type="submit" className="btn btn--primary">{isEdit ? 'Сохранить' : 'Создать'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PlanModal = ({ elements, onSubmit, onClose, error }) => {
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState(new Date().toISOString().slice(0, 10));
  const [components, setComponents] = useState([]);
  const [selectedElement, setSelectedElement] = useState('');
  const [quantity, setQuantity] = useState('');

  const selectedEl = elements.find((e) => e.id === Number(selectedElement));
  const displayUnit = selectedEl?.unit || 'кг';

  const addRow = () => {
    const id = Number(selectedElement);
    if (!id || !quantity) return;
    const el = elements.find((e) => e.id === id);
    const unitFromElement = el?.unit || 'кг';
    setComponents((prev) => [...prev, { element_id: id, element_name: el?.name, quantity: Number(quantity), unit: unitFromElement }]);
    setQuantity('');
  };

  const removeRow = (index) => {
    setComponents((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h3>Добавить</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Закрыть">×</button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              name: title,
              deadline,
              components: components.map((c) => ({ chemistry: c.element_id, quantity: c.quantity, unit: c.unit })),
            });
          }}
        >
          <label>Название задания</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Название задания" />
          <label>Хим. элементы</label>
          <div className="plan-modal__row">
            <select value={selectedElement} onChange={(e) => setSelectedElement(e.target.value)}>
              <option value="">— Выберите —</option>
              {elements.map((el) => (
                <option key={el.id} value={el.id}>{el.name} ({el.unit || 'кг'})</option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Кол-во"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="plan-modal__qty"
            />
            <span className="plan-modal__unit">{displayUnit}</span>
            <button type="button" className="btn btn--secondary" onClick={addRow}>Добавить</button>
          </div>
          {components.length > 0 && (
            <div className="plan-modal__table">
              <div className="plan-modal__table-header">
                <span>ХИМ. ЭЛЕМЕНТ</span>
                <span>КОЛ-ВО</span>
                <span>ЕД.</span>
                <span></span>
              </div>
              {components.map((c, i) => (
                <div key={i} className="plan-modal__table-row">
                  <span>{c.element_name}</span>
                  <span>{c.quantity}</span>
                  <span>{c.unit}</span>
                  <button type="button" className="btn btn--sm btn--danger" onClick={() => removeRow(i)}>×</button>
                </div>
              ))}
            </div>
          )}
          <label>Срок</label>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
          {error && <p className="modal__error">{error}</p>}
          <div className="modal__actions">
            <button type="submit" className="btn btn--primary">Добавить</button>
            <button type="button" className="btn btn--secondary" onClick={onClose}>Отмена</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChemistryPage;
