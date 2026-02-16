import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../../features/auth';
import { Loading, EmptyState, ErrorState } from '../../../../shared/ui';
import { getBatchesAwaitingOtk, getOtkHistory, acceptBatch } from '../../api';
import './OTKPage.scss';

const OTK_STATUSES = [
  { label: 'ОЖИДАЕТ', color: 'orange' },
  { label: '→', color: 'muted' },
  { label: 'ПРИНЯТО', color: 'green' },
  { label: '/', color: 'muted' },
  { label: 'БРАК', color: 'red' },
];

const formatDateTime = (d) => {
  if (!d) return '—';
  const s = typeof d === 'string' ? d : String(d);
  if (s.length >= 19) return `${s.slice(8, 10)}.${s.slice(5, 7)}.${s.slice(0, 4)} ${s.slice(11, 19)}`;
  return s.slice(0, 10);
};
const orderName = (b) => b.order_name || b.order_product || b.product_name || b.product?.name || b.product || b.recipe?.name || '—';
const errorToMessage = (err) => {
  const data = err?.response?.data;
  if (!data || typeof data !== 'object') return err?.message || 'Ошибка';
  const code = data.code ? `[${data.code}] ` : '';
  const base = data.error || data.message || 'Ошибка';
  const details = data.details && typeof data.details === 'object'
    ? Object.entries(data.details).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('; ')
    : (typeof data.details === 'string' ? data.details : '');
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

const statusOtk = (b) => {
  const s = String(b.otk_status ?? b.status ?? '').toLowerCase();
  const defectQty = Number(b.otk_defect) || 0;
  if (s === 'accepted' || s === 'принято') return { label: defectQty > 0 ? 'Принято с браком' : 'Принято', color: 'green' };
  if (s === 'defect' || s === 'rejected' || s === 'брак') return { label: 'БРАК', color: 'red' };
  return { label: 'ОЖИДАЕТ', color: 'orange' };
};

const OTKPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('awaiting');
  const [awaitingList, setAwaitingList] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [loadingAwaiting, setLoadingAwaiting] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [errorAwaiting, setErrorAwaiting] = useState(null);
  const [errorHistory, setErrorHistory] = useState(null);
  const [acceptModalBatch, setAcceptModalBatch] = useState(null);
  const [submitError, setSubmitError] = useState('');

  const loadAwaiting = () => {
    setLoadingAwaiting(true);
    setErrorAwaiting(null);
    getBatchesAwaitingOtk()
      .then((res) => setAwaitingList(res.items ?? []))
      .catch((err) => setErrorAwaiting(err.response?.data || { error: err.message }))
      .finally(() => setLoadingAwaiting(false));
  };

  const loadHistory = () => {
    setLoadingHistory(true);
    setErrorHistory(null);
    getOtkHistory()
      .then((res) => setHistoryList(res.items ?? []))
      .catch((err) => setErrorHistory(err.response?.data || { error: err.message }))
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => {
    loadAwaiting();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab]);

  const refetchAll = () => {
    loadAwaiting();
    loadHistory();
  };

  const handleAcceptSubmit = async (data) => {
    if (!acceptModalBatch?.id) return;
    setSubmitError('');
    try {
      await acceptBatch(acceptModalBatch.id, {
        ...data,
        inspector: user?.name || user?.email || null,
      });
      setAcceptModalBatch(null);
      refetchAll();
    } catch (err) {
      setSubmitError(errorToMessage(err));
    }
  };

  return (
    <div className="page page--otk">
      <h1 className="page__title">ОТК</h1>

      <div className="otk-statuses">
        <span className="otk-statuses__label">Статусы:</span>
        {OTK_STATUSES.map((st, i) => (
          <span
            key={i}
            className={`otk-statuses__chip otk-statuses__chip--${st.color}`}
          >
            {st.label}
          </span>
        ))}
      </div>

      <div className="otk-nav">
        <Link to="/production" className="otk-nav__link">Производство</Link>
        <span className="otk-nav__sep">→</span>
        <Link to="/warehouse" className="otk-nav__link">Склад ГП</Link>
      </div>

      <div className="otk-tabs">
        <button
          type="button"
          className={`otk-tabs__tab ${activeTab === 'awaiting' ? 'otk-tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('awaiting')}
        >
          Ожидают
        </button>
        <button
          type="button"
          className={`otk-tabs__tab ${activeTab === 'history' ? 'otk-tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          История
        </button>
      </div>

      {activeTab === 'awaiting' && (
        <div className="otk-card">
          <h2 className="otk-card__title">Контроль качества — ожидает проверки</h2>
          <p className="otk-card__subtitle">Партии, требующие проверки ОТК</p>
          {loadingAwaiting && <Loading />}
          {errorAwaiting && <ErrorState error={errorAwaiting} onRetry={loadAwaiting} />}
          {!loadingAwaiting && !errorAwaiting && awaitingList.length === 0 && (
            <EmptyState title="Нет партий, ожидающих проверки" />
          )}
          {!loadingAwaiting && !errorAwaiting && awaitingList.length > 0 && (
            <div className="otk-table otk-table--awaiting">
              <div className="otk-table__header">
                <span className="otk-table__th">ЗАКАЗ</span>
                <span className="otk-table__th">КОЛИЧЕСТВО</span>
                <span className="otk-table__th">ОПЕРАТОР</span>
                <span className="otk-table__th">ДАТА ПРОИЗВОДСТВА</span>
                <span className="otk-table__th otk-table__th--actions">ДЕЙСТВИЯ</span>
              </div>
              {awaitingList.map((b) => {
                const qty = b.quantity ?? b.released ?? 0;
                return (
                  <div key={b.id} className="otk-table__row">
                    <span>{orderName(b)}</span>
                    <span className="otk-table__qty-pill">{qty} шт</span>
                    <span>{b.operator_name || b.operator?.name || b.operator || b.assigned_to || '—'}</span>
                    <span>{formatDateTime(b.date || b.created_at)}</span>
                    <div className="otk-table__actions">
                      <button
                        type="button"
                        className="btn btn--primary btn--sm otk-btn-check"
                        onClick={() => setAcceptModalBatch(b)}
                      >
                        <span className="otk-btn-check__icon">✓</span> Проверить
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="otk-card">
          <h2 className="otk-card__title">История контроля качества</h2>
          <p className="otk-card__subtitle">Проверенные партии</p>
          {loadingHistory && <Loading />}
          {errorHistory && <ErrorState error={errorHistory} onRetry={loadHistory} />}
          {!loadingHistory && !errorHistory && historyList.length === 0 && (
            <EmptyState title="Нет записей в истории" />
          )}
          {!loadingHistory && !errorHistory && historyList.length > 0 && (
            <div className="otk-table otk-table--history">
              <div className="otk-table__header">
                <span className="otk-table__th">СТАТУС</span>
                <span className="otk-table__th">ЗАКАЗ</span>
                <span className="otk-table__th">ПРИНЯТО</span>
                <span className="otk-table__th">БРАК</span>
                <span className="otk-table__th">ПРИЧИНА БРАКА</span>
                <span className="otk-table__th">ИНСПЕКТОР ОТК</span>
                <span className="otk-table__th">ДАТА ПРОВЕРКИ</span>
                <span className="otk-table__th">КОММЕНТАРИЙ</span>
              </div>
              {historyList.map((b) => {
                const st = statusOtk(b);
                return (
                  <div key={b.id} className="otk-table__row">
                    <span className={`otk-table__status otk-table__status--${st.color}`}>
                      {st.label}
                    </span>
                    <span>{orderName(b)}</span>
                    <span className="otk-table__qty-pill otk-table__qty-pill--white">{b.otk_accepted ?? 0} шт</span>
                    <span className="otk-table__qty-pill otk-table__qty-pill--red">{b.otk_defect ?? 0} шт</span>
                    <span>{b.otk_defect_reason || '—'}</span>
                    <span>{b.otk_inspector || '—'}</span>
                    <span>{formatDateTime(b.otk_checked_at)}</span>
                    <span>{b.otk_comment || '—'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {acceptModalBatch && (
        <AcceptModal
          key={acceptModalBatch.id}
          batch={acceptModalBatch}
          onSubmit={handleAcceptSubmit}
          onClose={() => { setAcceptModalBatch(null); setSubmitError(''); }}
          error={submitError}
        />
      )}
    </div>
  );
};

const AcceptModal = ({ batch, onSubmit, onClose, error }) => {
  const produced = Number(batch?.quantity ?? batch?.released ?? 0) || 0;
  const [accepted, setAccepted] = useState(produced > 0 ? String(produced) : '');
  const [defect, setDefect] = useState('0');
  const [defectReason, setDefectReason] = useState('');
  const [comment, setComment] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const a = Number(accepted) || 0;
    const d = Number(defect) || 0;
    if (a + d <= 0) return;
    if (produced > 0 && a + d !== produced) return;
    if (d > 0 && !defectReason.trim()) return;
    onSubmit({
      accepted: a,
      defect: d,
      defect_reason: defectReason.trim() || undefined,
      comment: comment.trim() || undefined,
    });
  };

  const defectQty = Number(defect) || 0;
  const defectReasonRequired = defectQty > 0;
  const acceptedQty = Number(accepted) || 0;
  const invalidTotal = produced > 0 && acceptedQty + defectQty !== produced;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h3>Контроль качества</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Закрыть">×</button>
        </div>
        <p className="otk-modal-subtitle">Проверка произведённой партии</p>
        <div className="otk-modal-readonly">
          <div className="otk-modal-readonly__row">
            <span className="otk-modal-readonly__label">Заказ:</span>
            <span>{orderName(batch)}</span>
          </div>
          <div className="otk-modal-readonly__row">
            <span className="otk-modal-readonly__label">Оператор:</span>
            <span>{batch?.operator_name || batch?.operator?.name || batch?.operator || '—'}</span>
          </div>
          <div className="otk-modal-readonly__row">
            <span className="otk-modal-readonly__label">Количество произведено:</span>
            <span>{produced} шт</span>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <label>Принято (шт)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={accepted}
            onChange={(e) => setAccepted(e.target.value)}
          />
          <label>Брак (шт)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={defect}
            onChange={(e) => setDefect(e.target.value)}
          />
          <label>Комментарий</label>
          <textarea
            className="otk-modal-textarea"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Примечания по качеству продукции"
            rows={2}
          />
          <label>Причина брака {defectReasonRequired && '*'}</label>
          <textarea
            className="otk-modal-textarea"
            value={defectReason}
            onChange={(e) => setDefectReason(e.target.value)}
            placeholder="Укажите причину брака (обязательно при наличии брака)"
            rows={2}
          />
          {error && <p className="modal__error">{error}</p>}
          {invalidTotal && (
            <p className="modal__error">
              Сумма «Принято + Брак» должна быть равна выпущенному количеству ({produced} шт).
            </p>
          )}
          <div className="modal__actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn--primary" disabled={invalidTotal}>Сохранить результат</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OTKPage;
