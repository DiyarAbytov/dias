import { apiClient } from '../../../shared/api';

export const getAnalyticsSummary = (params) => apiClient.get('analytics/summary/', { params });

// Детализация прихода/расхода/прибыли
export const getRevenueDetails = (params) => apiClient.get('analytics/revenue-details/', { params });
export const getExpenseDetails = (params) => apiClient.get('analytics/expense-details/', { params });
