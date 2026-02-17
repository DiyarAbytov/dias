import React, { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, LabelList } from 'recharts';
import './AnalyticsPage.scss';
import { apiClient } from '../../../../shared/api';
import { getRevenueDetails, getExpenseDetails } from '../../api';
import { Loading, ErrorState } from '../../../../shared/ui';

const formatNumber = (num) => Number(num || 0).toLocaleString('ru-RU');
const formatMoney = (num) => `${formatNumber(num)} ₽`;

const COLORS = ['#58a6ff', '#4caf50', '#ffc107', '#f44336', '#9c27b0', '#ff9800'];

const ArrowLabel = ({ x, y, payload, diffKey, upColor, downColor }) => {
  if (!payload) return null;
  const diff = payload[diffKey];
  const arrow = diff == null || diff === 0 ? '◆' : diff > 0 ? '▲' : '▼';
  const color = diff == null || diff === 0 ? '#a0aec0' : diff > 0 ? upColor : downColor;
  return (
    <text x={x} y={y - 14} textAnchor="middle" fill={color} fontSize={14} fontWeight="bold">{arrow}</text>
  );
};

const CustomDot = ({ cx, cy, fill, stroke }) => (
  <circle cx={cx} cy={cy} r={5} fill={fill} stroke={stroke || '#1a202c'} strokeWidth={2} />
);

const buildFullMonthTrendsData = (year, month, dailyRevenue = [], dailyExpenses = []) => {
  if (!month || !year) return [];
  const daysInMonth = new Date(year, month, 0).getDate();
  const revenueByDate = Object.fromEntries((dailyRevenue || []).flatMap(d => [
    [d.date, d.revenue || 0],
    ...(d.date?.length > 5 ? [[d.date.slice(5), d.revenue || 0]] : []),
  ]));
  const expenseByDate = Object.fromEntries((dailyExpenses || []).flatMap(d => [
    [d.date, d.expense || 0],
    ...(d.date?.length > 5 ? [[d.date.slice(5), d.expense || 0]] : []),
  ]));
  const result = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dateShort = dateStr.slice(5);
    const revenue = revenueByDate[dateStr] ?? revenueByDate[dateShort] ?? 0;
    const expense = expenseByDate[dateStr] ?? expenseByDate[dateShort] ?? 0;
    const prev = result[result.length - 1];
    result.push({
      date: dateStr.slice(5),
      fullDate: dateStr,
      revenue,
      expense,
      revenueDiff: prev ? revenue - prev.revenue : null,
      expenseDiff: prev ? expense - prev.expense : null,
    });
  }
  return result;
};

const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [trendsDataRaw, setTrendsDataRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [detailModal, setDetailModal] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    const params = { year };
    if (month) params.month = month;
    if (day) params.day = day;
    
    const loadMain = apiClient.get('analytics/summary/', { params });
    const trendsParams = { year };
    if (month) trendsParams.month = month;
    const loadTrends = apiClient.get('analytics/summary/', { params: trendsParams });
    
    Promise.all([loadMain, loadTrends])
      .then(([mainRes, trendsRes]) => {
        setData(mainRes.data);
        setTrendsDataRaw(trendsRes.data?.trends || null);
      })
      .catch((err) => setError(err.response?.data || { error: err.message }))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), [year, month, day]);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={load} />;

  const finances = data?.finances || {};
  const sales = data?.sales || {};
  const expenses = data?.expenses_breakdown || {};
  const production = data?.production || {};
  const warehouse = data?.warehouse || {};
  const shipments = data?.shipments || {};
  const stocks = data?.stock_balances || {};

  const months = [
    { value: '', label: 'Весь год' },
    { value: 1, label: 'Январь' }, { value: 2, label: 'Февраль' }, { value: 3, label: 'Март' },
    { value: 4, label: 'Апрель' }, { value: 5, label: 'Май' }, { value: 6, label: 'Июнь' },
    { value: 7, label: 'Июль' }, { value: 8, label: 'Август' }, { value: 9, label: 'Сентябрь' },
    { value: 10, label: 'Октябрь' }, { value: 11, label: 'Ноябрь' }, { value: 12, label: 'Декабрь' },
  ];

  const productChartData = sales.top_products?.map(p => ({
    name: p.product_name,
    value: p.quantity,
    revenue: p.revenue,
  })) || [];

  const clientChartData = sales.top_clients?.map(c => ({
    name: c.client_name,
    value: c.revenue,
  })) || [];

  const supplierChartData = expenses.by_supplier?.map(s => ({
    name: s.supplier,
    value: s.amount,
  })) || [];

  const lineChartData = production.by_line?.map(l => ({
    name: l.line_name,
    quantity: l.quantity,
    batches: l.batches,
  })) || [];

  const trends = trendsDataRaw || data?.trends || {};
  const trendsData = month
    ? buildFullMonthTrendsData(year, Number(month), trends.daily_revenue, trends.daily_expenses)
    : (trends.daily_revenue?.map((d, i) => {
        const expenseItem = trends.daily_expenses?.find(e => e.date === d.date);
        const revenue = d.revenue || 0;
        const expense = expenseItem?.expense || 0;
        const prevRevenue = i > 0 ? (trends.daily_revenue[i - 1]?.revenue || 0) : null;
        const prevExpense = i > 0 ? (trends.daily_expenses?.find(e => e.date === trends.daily_revenue[i - 1]?.date)?.expense || 0) : null;
        return {
          date: d.date?.slice(5) || d.date,
          fullDate: d.date,
          revenue,
          expense,
          revenueDiff: prevRevenue != null ? revenue - prevRevenue : null,
          expenseDiff: prevExpense != null ? expense - prevExpense : null,
        };
      }) || []);

  const renderPieLabel = (entry) => {
    return `${entry.name}: ${formatMoney(entry.value)}`;
  };

  return (
    <div className="page page--analytics">
      <div className="analytics-filters">
        <div className="analytics-filters__group">
          <label>Год</label>
          <input
            type="number"
            min="2020"
            max="2030"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </div>
        <div className="analytics-filters__group">
          <label>Месяц</label>
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div className="analytics-filters__group">
          <label>День</label>
          <select value={day} onChange={(e) => setDay(e.target.value)}>
            <option value="">Весь месяц</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <button type="button" className="btn btn--secondary" onClick={() => { setMonth(''); setDay(''); }}>Сброс</button>
      </div>

      {/* ФИНАНСЫ - главные карты */}
      <div className="analytics-section">
        <div className="analytics-cards analytics-cards--main">
          <div 
            className="analytics-card analytics-card--revenue analytics-card--clickable"
            onClick={() => setDetailModal({ type: 'revenue', data: finances })}
          >
            <div className="analytics-card__icon">📈</div>
            <div className="analytics-card__label">Приход</div>
            <div className="analytics-card__value">{formatMoney(finances.revenue)}</div>
            <div className="analytics-card__hint">за период - нажмите для детализации</div>
          </div>
          <div 
            className="analytics-card analytics-card--expense analytics-card--clickable"
            onClick={() => setDetailModal({ type: 'expense', data: finances })}
          >
            <div className="analytics-card__icon">📉</div>
            <div className="analytics-card__label">Расход</div>
            <div className="analytics-card__value">{formatMoney(finances.expenses)}</div>
            <div className="analytics-card__hint">за период - нажмите для детализации</div>
          </div>
          <div 
            className="analytics-card analytics-card--profit analytics-card--clickable"
            onClick={() => setDetailModal({ type: 'profit', data: finances })}
          >
            <div className="analytics-card__icon">💰</div>
            <div className="analytics-card__label">Прибыль</div>
            <div className="analytics-card__value">{formatMoney(finances.profit)}</div>
            <div className="analytics-card__hint">за период - нажмите для детализации</div>
          </div>
        </div>
      </div>

      {/* ТРЕНДЫ - ГРАФИКИ (по каждому дню + стрелки вверх/вниз) */}
      {trendsData.length > 0 && (
        <div className="analytics-section">
          <h2 className="analytics-section__title">Динамика доходов и расходов по дням</h2>
          <p className="analytics-section__hint">▲ рост к предыдущему дню · ▼ снижение · ◆ без изменений. Карточки выше — итого за выбранный период.</p>
          <div className="analytics-chart-container analytics-chart-container--large">
            <ResponsiveContainer width="100%" height={450}>
              <AreaChart data={trendsData} margin={{ top: 64, right: 30, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4caf50" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#4caf50" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f44336" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#f44336" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" strokeOpacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  stroke="#a0aec0"
                  tick={{ fill: '#a0aec0', fontSize: 13 }}
                  axisLine={{ stroke: '#2d3748' }}
                />
                <YAxis 
                  stroke="#a0aec0"
                  tick={{ fill: '#a0aec0', fontSize: 13 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k ₽`}
                  axisLine={{ stroke: '#2d3748' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(26, 32, 44, 0.95)', 
                    border: '1px solid #2d3748', 
                    borderRadius: '12px', 
                    padding: '16px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                  }}
                  labelStyle={{ color: '#e2e8f0', fontWeight: 700, marginBottom: '12px', fontSize: '15px' }}
                  formatter={(value, name) => [
                    formatMoney(value), 
                    name === 'Приход' ? '💰 Приход' : '💸 Расход'
                  ]}
                  cursor={{ fill: 'rgba(88, 166, 255, 0.08)' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '24px', fontSize: '15px' }}
                  iconType="square"
                  iconSize={18}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#4caf50"
                  strokeWidth={2}
                  fill="url(#colorRevenue)"
                  name="Приход"
                  dot={<CustomDot fill="#4caf50" />}
                  activeDot={{ r: 6, stroke: '#1a202c', strokeWidth: 2 }}
                >
                  <LabelList dataKey="revenue" position="top" content={(props) => <ArrowLabel {...props} diffKey="revenueDiff" upColor="#4caf50" downColor="#e57373" />} />
                </Area>
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#f44336"
                  strokeWidth={2}
                  fill="url(#colorExpense)"
                  name="Расход"
                  dot={<CustomDot fill="#f44336" />}
                  activeDot={{ r: 6, stroke: '#1a202c', strokeWidth: 2 }}
                >
                  <LabelList dataKey="expense" position="top" content={(props) => <ArrowLabel {...props} diffKey="expenseDiff" upColor="#81c784" downColor="#f44336" />} />
                </Area>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ПРОДАЖИ + РАСХОДЫ */}
      <div className="analytics-section">
        <div className="analytics-grid analytics-grid--2col">
          {/* ПРОДАЖИ */}
          <div className="analytics-block">
            <h3>Продажи</h3>
            <div className="analytics-stats">
              <div className="analytics-stat">
                <span className="analytics-stat__number">{sales.total_count || 0}</span>
                <span className="analytics-stat__label">Продаж</span>
              </div>
              <div className="analytics-stat">
                <span className="analytics-stat__number">{formatNumber(sales.total_quantity)}</span>
                <span className="analytics-stat__label">Единиц</span>
              </div>
            </div>
            {productChartData.length > 0 && (
              <div className="analytics-chart-container" style={{ marginTop: '1.5rem' }}>
                <h4>ТОП Продукты</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={productChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                    <XAxis dataKey="name" stroke="#a0aec0" />
                    <YAxis stroke="#a0aec0" />
                    <Tooltip 
                      contentStyle={{ background: '#1a202c', border: '1px solid #2d3748', borderRadius: '6px' }}
                      labelStyle={{ color: '#e2e8f0' }}
                      formatter={(value, name) => [value, name === 'value' ? 'Количество' : name]}
                    />
                    <Bar dataKey="value" fill="#4caf50" name="Количество" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* КЛИЕНТЫ */}
          <div className="analytics-block">
            <h3>ТОП Клиенты</h3>
            {clientChartData.length > 0 ? (
              <div className="analytics-chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={clientChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={renderPieLabel}
                      labelLine={{ stroke: '#a0aec0' }}
                    >
                      {clientChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ background: '#1a202c', border: '1px solid #2d3748', borderRadius: '6px' }}
                      formatter={(value) => formatMoney(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="analytics-empty">Нет данных</p>}
          </div>
        </div>
      </div>

      {/* ПРОИЗВОДСТВО */}
      <div className="analytics-section">
        <h2 className="analytics-section__title">Производство</h2>
        <div className="analytics-grid analytics-grid--2col">
          <div className="analytics-block">
            <div className="analytics-stats">
              <div className="analytics-stat">
                <span className="analytics-stat__number">{production.total_batches || 0}</span>
                <span className="analytics-stat__label">Партий</span>
              </div>
              <div className="analytics-stat">
                <span className="analytics-stat__number">{formatNumber(production.total_quantity)}</span>
                <span className="analytics-stat__label">Произведено</span>
              </div>
            </div>
          </div>
          {lineChartData.length > 0 && (
            <div className="analytics-block">
              <h3>По линиям</h3>
              <div className="analytics-chart-container">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={lineChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                    <XAxis dataKey="name" stroke="#a0aec0" />
                    <YAxis stroke="#a0aec0" />
                    <Tooltip 
                      contentStyle={{ background: '#1a202c', border: '1px solid #2d3748', borderRadius: '6px' }}
                    />
                    <Bar dataKey="quantity" fill="#58a6ff" name="Количество" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* СКЛАД ГП + ОТГРУЗКИ */}
      <div className="analytics-section">
        <div className="analytics-grid analytics-grid--2col">
          {/* СКЛАД ГП */}
          <div className="analytics-block">
            <h3>Склад ГП</h3>
            <div className="analytics-cards analytics-cards--mini">
              <div className="analytics-card analytics-card--success">
                <div className="analytics-card__label">Доступно</div>
                <div className="analytics-card__value">{formatNumber(warehouse.total_available)}</div>
              </div>
              <div className="analytics-card analytics-card--warning">
                <div className="analytics-card__label">Резерв</div>
                <div className="analytics-card__value">{formatNumber(warehouse.total_reserved)}</div>
              </div>
              <div className="analytics-card analytics-card--info">
                <div className="analytics-card__label">Отгружено</div>
                <div className="analytics-card__value">{formatNumber(warehouse.total_shipped)}</div>
              </div>
            </div>
          </div>

          {/* ОТГРУЗКИ */}
          <div className="analytics-block">
            <h3>Отгрузки</h3>
            <div className="analytics-cards analytics-cards--mini">
              <div className="analytics-card">
                <div className="analytics-card__label">Всего</div>
                <div className="analytics-card__value">{shipments.total_count || 0}</div>
              </div>
              <div className="analytics-card analytics-card--warning">
                <div className="analytics-card__label">Ожидает</div>
                <div className="analytics-card__value">{shipments.pending || 0}</div>
              </div>
              <div className="analytics-card analytics-card--info">
                <div className="analytics-card__label">В пути</div>
                <div className="analytics-card__value">{shipments.shipped || 0}</div>
              </div>
              <div className="analytics-card analytics-card--success">
                <div className="analytics-card__label">Доставлено</div>
                <div className="analytics-card__value">{shipments.delivered || 0}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ОСТАТКИ */}
      <div className="analytics-section">
        <h2 className="analytics-section__title">Остатки на складах</h2>
        <div className="analytics-grid analytics-grid--2col">
          <div className="analytics-block">
            <h3>Сырьё</h3>
            {stocks.raw_materials?.length ? (
              <ul className="analytics-list analytics-list--compact">
                {stocks.raw_materials.slice(0, 8).map((m, i) => (
                  <li key={i} className={m.low_stock ? 'analytics-list__item--warning' : ''}>
                    <span className="analytics-list__name">{m.name}</span>
                    <span className="analytics-list__value">
                      {m.balance} {m.unit}
                      {m.low_stock && ' ⚠️'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : <p className="analytics-empty">Нет данных</p>}
          </div>
          <div className="analytics-block">
            <h3>Химия</h3>
            {stocks.chemistry?.length ? (
              <ul className="analytics-list analytics-list--compact">
                {stocks.chemistry.slice(0, 8).map((c, i) => (
                  <li key={i} className={c.low_stock ? 'analytics-list__item--warning' : ''}>
                    <span className="analytics-list__name">{c.name}</span>
                    <span className="analytics-list__value">
                      {c.balance} {c.unit}
                      {c.low_stock && ' ⚠️'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : <p className="analytics-empty">Нет данных</p>}
          </div>
        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО ДЕТАЛИЗАЦИИ */}
      {detailModal && (
        <DetailModal
          type={detailModal.type}
          data={detailModal.data}
          fullData={data}
          onClose={() => setDetailModal(null)}
        />
      )}
    </div>
  );
};

const DetailModal = ({ type, data, fullData, onClose }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  
  const titles = {
    revenue: 'Детализация прихода',
    expense: 'Детализация расхода',
    profit: 'Детализация прибыли',
  };

  useEffect(() => {
    if (type === 'revenue' || type === 'expense') {
      setLoading(true);
      setError(false);
      const params = {
        year: fullData.period?.year,
        month: fullData.period?.month,
        day: fullData.period?.day,
      };
      
      const fetchDetails = type === 'revenue' ? getRevenueDetails(params) : getExpenseDetails(params);
      
      fetchDetails
        .then((res) => setDetails(res.data))
        .catch((err) => {
          console.error('Failed to fetch details:', err);
          setError(true);
        })
        .finally(() => setLoading(false));
    }
  }, [type, fullData]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h3>{titles[type]}</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Закрыть">×</button>
        </div>
        <div className="detail-content">
          {loading && <p className="analytics-empty">Загрузка...</p>}
          {error && <p className="analytics-empty">⚠️ Эндпоинт ещё не реализован на бэкенде</p>}
          
          {type === 'revenue' && details && !loading && !error && (
            <>
              <div className="detail-row detail-row--big">
                <span className="detail-row__label">Общий приход</span>
                <span className="detail-row__value">{formatMoney(details.total)}</span>
              </div>
              <div className="detail-section">
                <h4>Все продажи ({details.items?.length || 0}):</h4>
                <div className="detail-table-header">
                  <div className="detail-table-cell">Дата</div>
                  <div className="detail-table-cell">Клиент</div>
                  <div className="detail-table-cell">Продукт</div>
                  <div className="detail-table-cell">Кол-во</div>
                  <div className="detail-table-cell">Цена</div>
                  <div className="detail-table-cell">Сумма</div>
                </div>
                <div className="detail-table">
                  {details.items?.map((item, i) => (
                    <div key={i} className="detail-table-row">
                      <div className="detail-table-cell">{item.date}</div>
                      <div className="detail-table-cell">{item.client_name}</div>
                      <div className="detail-table-cell">{item.product_name}</div>
                      <div className="detail-table-cell">{item.quantity} шт</div>
                      <div className="detail-table-cell">{formatMoney(item.price_per_unit)}</div>
                      <div className="detail-table-cell detail-table-cell--strong">{formatMoney(item.total)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          
          {type === 'expense' && details && !loading && !error && (
            <>
              <div className="detail-row detail-row--big">
                <span className="detail-row__label">Общий расход</span>
                <span className="detail-row__value">{formatMoney(details.total)}</span>
              </div>
              <div className="detail-section">
                <h4>Все закупки ({details.items?.length || 0}):</h4>
                <div className="detail-table-header">
                  <div className="detail-table-cell">Дата</div>
                  <div className="detail-table-cell">Материал</div>
                  <div className="detail-table-cell">Поставщик</div>
                  <div className="detail-table-cell">Кол-во</div>
                  <div className="detail-table-cell">Цена</div>
                  <div className="detail-table-cell">Сумма</div>
                </div>
                <div className="detail-table">
                  {details.items?.map((item, i) => (
                    <div key={i} className="detail-table-row">
                      <div className="detail-table-cell">{item.date}</div>
                      <div className="detail-table-cell">{item.material_name}</div>
                      <div className="detail-table-cell">{item.supplier}</div>
                      <div className="detail-table-cell">{item.quantity} {item.unit}</div>
                      <div className="detail-table-cell">{formatMoney(item.price_per_unit)}</div>
                      <div className="detail-table-cell detail-table-cell--strong">{formatMoney(item.total)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {type === 'profit' && (
            <>
              <div className="detail-row detail-row--big">
                <span className="detail-row__label">Чистая прибыль</span>
                <span className="detail-row__value">{formatMoney(data.profit)}</span>
              </div>
              <div className="detail-section">
                <h4>Расчёт:</h4>
                <div className="detail-row">
                  <span className="detail-row__label">Приход (продажи)</span>
                  <span className="detail-row__value detail-row__value--positive">+ {formatMoney(data.revenue)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-row__label">Расход (закупки)</span>
                  <span className="detail-row__value detail-row__value--negative">- {formatMoney(data.expenses)}</span>
                </div>
                <div className="detail-row detail-row--total">
                  <span className="detail-row__label">Итого</span>
                  <span className="detail-row__value">{formatMoney(data.profit)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
