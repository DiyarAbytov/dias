/**
 * Этап 2: Клиенты, Продажи, Отгрузки.
 * Скрыты, пока бизнес-логика не утверждена.
 */
export const STAGE2_TABS_ENABLED = false;

/** Доступы для ролей (access_keys по документации) */
export const ACCESS_KEYS = [
  'users',
  'lines',
  'materials',
  'chemistry',
  'recipes',
  'orders',
  'production',
  'otk',
  'warehouse',
  'analytics',
  'clients',
  'sales',
  'shipments',
];

export const ACCESS_LABELS = {
  users: 'Пользователи',
  lines: 'Линии',
  materials: 'Склад сырья',
  chemistry: 'Химия',
  recipes: 'Рецепты',
  orders: 'Заказы',
  production: 'Производство',
  otk: 'ОТК',
  warehouse: 'Склад ГП',
  analytics: 'Аналитика',
  clients: 'Клиенты',
  sales: 'Продажи',
  shipments: 'Отгрузки',
};
