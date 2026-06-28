import { request } from './client';

export const financesApi = {
  overview: (months = 12, today, projection = 0) =>
    request(
      `/finances/overview?months=${months}&today=${encodeURIComponent(today)}&projection=${projection}`,
    ),

  envelopes: (includeArchived = false) =>
    request(
      `/finances/envelopes${includeArchived ? '?includeArchived=true' : ''}`,
    ),

  settings: () => request('/finances/settings'),

  updateSettings: (data) =>
    request('/finances/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  bulkSnapshots: (data) =>
    request('/finances/snapshots/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  envelope: (id) => request(`/finances/envelopes/${id}`),

  create: (data) =>
    request('/finances/envelopes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id, data) =>
    request(`/finances/envelopes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  archive: (id) =>
    request(`/finances/envelopes/${id}/archive`, { method: 'POST' }),

  unarchive: (id) =>
    request(`/finances/envelopes/${id}/unarchive`, { method: 'POST' }),

  remove: (id) => request(`/finances/envelopes/${id}`, { method: 'DELETE' }),

  reorder: (ids) =>
    request('/finances/envelopes/reorder', {
      method: 'PUT',
      body: JSON.stringify({ ids }),
    }),

  setSnapshot: (id, date, data) =>
    request(`/finances/envelopes/${id}/snapshots/${date}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  removeSnapshot: (id) =>
    request(`/finances/snapshots/${id}`, { method: 'DELETE' }),
};
