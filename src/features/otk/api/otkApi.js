import { apiClient } from '../../../shared/api';

/** Партии, ожидающие проверки ОТК: все, у которых ещё нет итога ОТК (принято/брак) */
export const getBatchesAwaitingOtk = (params = {}) =>
  apiClient
    .get('batches/', { params: { page_size: 100, ...params } })
    .then((res) => {
      const items = res.data?.items ?? [];
      const otkDone = ['accepted', 'принято', 'defect', 'брак'];
      const awaiting = items.filter((b) => {
        const s = String(b.otk_status ?? '').toLowerCase();
        const done = otkDone.some((d) => s === d);
        return !done;
      });
      return { items: awaiting, meta: res.data?.meta ?? {} };
    })
    .catch((err) => {
      if (err.response?.status === 404) return { items: [], meta: {} };
      throw err;
    });

/** История проверок ОТК — все партии с заполненным результатом проверки */
export const getOtkHistory = (params = {}) =>
  apiClient
    .get('batches/', { params: { page_size: 100, ...params } })
    .then((res) => {
      const items = res.data?.items ?? [];
      const withOtk = items.filter((b) => {
        const s = String(b.otk_status ?? '').toLowerCase();
        return s === 'accepted' || s === 'принято' || s === 'defect' || s === 'брак' || b.otk_checked_at || b.otk_accepted != null;
      });
      return { items: withOtk, meta: res.data?.meta ?? {} };
    })
    .catch((err) => {
      if (err.response?.status === 404) return { items: [], meta: {} };
      throw err;
    });

/**
 * Принять партию в ОТК: указать принято/брак, причину и комментарий.
 * Бэкенд обновляет otk_status (accepted/defect), заказ и производство при необходимости.
 */
export const acceptBatch = (batchId, data) =>
  apiClient.patch(`batches/${batchId}/`, {
    otk_accepted: data.accepted,
    otk_defect: data.defect ?? 0,
    otk_defect_reason: data.defect_reason || null,
    otk_comment: data.comment || null,
    otk_status: (data.defect > 0 && data.accepted === 0 ? 'defect' : 'accepted'),
    otk_inspector: data.inspector || null,
    otk_checked_at: new Date().toISOString(),
  });
