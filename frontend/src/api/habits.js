import { request } from './client';

export const habitsApi = {
  list: (today) => request(`/habits?today=${encodeURIComponent(today)}`),

  checksInRange: (from, to) =>
    request(`/habits/checks?from=${from}&to=${to}`),

  create: (data) =>
    request('/habits', { method: 'POST', body: JSON.stringify(data) }),

  update: (id, data) =>
    request(`/habits/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  archive: (id) => request(`/habits/${id}/archive`, { method: 'POST' }),

  remove: (id) => request(`/habits/${id}`, { method: 'DELETE' }),

  reorder: (ids) =>
    request('/habits/reorder', { method: 'PUT', body: JSON.stringify({ ids }) }),

  setCheck: (id, date, checked, today) =>
    request(`/habits/${id}/checks/${date}?today=${encodeURIComponent(today)}`, {
      method: 'PUT',
      body: JSON.stringify({ checked }),
    }),
};
