import { apiClient } from '../../../shared/api';

/** Список партий из ответа: поддерживаем items (наш контракт) и results (Django REST) */
const getBatchList = (data) => (data?.items ?? data?.results ?? []);
const isEndpointMissing = (err) => err?.response?.status === 404 || err?.response?.status === 405;

/** Партии, ожидающие проверки ОТК: все, у которых ещё нет итога ОТК (принято/брак) */
export const getBatchesAwaitingOtk = async (params = {}) => {
  try {
    const res = await apiClient.get('otk/pending/', { params: { page_size: 100, ...params } });
    const items = getBatchList(res.data);
    return { items, meta: res.data?.meta ?? res.data ?? {} };
  } catch (err) {
    if (!isEndpointMissing(err)) throw err;
    return apiClient
      .get('batches/', { params: { page_size: 100, ...params } })
      .then((res) => {
        const items = getBatchList(res.data);
        const otkDone = ['accepted', 'принято', 'defect', 'rejected', 'брак'];
        const awaiting = items.filter((b) => {
          const s = String(b.otk_status ?? '').toLowerCase();
          const done = otkDone.some((d) => s === d);
          return !done;
        });
        return { items: awaiting, meta: res.data?.meta ?? res.data ?? {} };
      })
      .catch((fallbackErr) => {
        if (fallbackErr.response?.status === 404) return { items: [], meta: {} };
        throw fallbackErr;
      });
  }
};

/** История проверок ОТК — все партии с заполненным результатом проверки */
export const getOtkHistory = (params = {}) =>
  apiClient
    .get('batches/', { params: { page_size: 100, ...params } })
    .then((res) => {
      const items = getBatchList(res.data);
      const withOtk = items.filter((b) => {
        const s = String(b.otk_status ?? '').toLowerCase();
        return s === 'accepted' || s === 'принято' || s === 'defect' || s === 'rejected' || s === 'брак' || b.otk_checked_at || b.otk_accepted != null;
      });
      return { items: withOtk, meta: res.data?.meta ?? res.data ?? {} };
    })
    .catch((err) => {
      if (err.response?.status === 404) return { items: [], meta: {} };
      throw err;
    });

/**
 * Сохранить результат проверки ОТК: POST /api/batches/{id}/otk_accept/
 * Бэкенд: OtkCheck, batch.otk_status (accepted/rejected), при принятом > 0 — запись на склад ГП.
 */
export const acceptBatch = (batchId, data) =>
  apiClient.post('otk/check/', {
    batchId,
    accepted: data.accepted,
    rejected: data.defect ?? 0,
    defect_reason: data.defect_reason || null,
    comment: data.comment || null,
  }).catch((err) => {
    if (!isEndpointMissing(err)) throw err;
    return apiClient.post(`batches/${batchId}/otk_accept/`, {
      otk_accepted: data.accepted,
      otk_defect: data.defect ?? 0,
      otk_defect_reason: data.defect_reason || null,
      otk_comment: data.comment || null,
      otk_status: (data.defect > 0 && data.accepted === 0 ? 'rejected' : 'accepted'),
      otk_inspector: data.inspector || null,
      otk_checked_at: new Date().toISOString(),
    });
  });
