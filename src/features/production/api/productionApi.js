import { apiClient } from '../../../shared/api';

const isEndpointMissing = (err) => err?.response?.status === 404 || err?.response?.status === 405;

export const getOrdersInProgress = async (params = {}) => {
  try {
    return await apiClient.get('/production/orders/', { params });
  } catch (err) {
    if (!isEndpointMissing(err)) throw err;
    return apiClient.get('/orders/', { params: { ...params, page_size: params.page_size ?? 100 } });
  }
};

export const getBatches = async (params = {}) => {
  try {
    return await apiClient.get('/production/batches/', { params });
  } catch (err) {
    if (isEndpointMissing(err)) {
      return apiClient.get('/batches/', { params });
    }
    if (err.response?.status === 404) return { data: { items: [], meta: {} } };
    throw err;
  }
};

export const releaseOrder = async (orderId, data) => {
  const quantity = Number(data?.quantity);
  try {
    return await apiClient.post('/production/release/', {
      orderId: Number(orderId),
      quantity,
    });
  } catch (err) {
    if (!isEndpointMissing(err)) throw err;
    return apiClient.post(`/orders/${orderId}/release/`, { quantity });
  }
};
