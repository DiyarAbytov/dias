import { apiClient } from '../../../shared/api';

export const getOrdersInProgress = (params) =>
  apiClient.get('/orders/', { params: { ...params, status: 'in_progress' } });

export const getBatches = (params) =>
  apiClient.get('/batches/', { params }).catch((err) => {
    if (err.response?.status === 404) return { data: { items: [], meta: {} } };
    throw err;
  });

export const releaseOrder = (orderId, data) =>
  apiClient.post(`/orders/${orderId}/release/`, data);
