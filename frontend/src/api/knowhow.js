import { request } from './client';

export const knowhowApi = {
  // --- Savoir-faire ---
  list: (includeArchived = false) =>
    request(`/knowhow${includeArchived ? '?includeArchived=true' : ''}`),

  get: (id) => request(`/knowhow/${id}`),

  create: (data) => request('/knowhow', { method: 'POST', body: JSON.stringify(data) }),

  update: (id, data) =>
    request(`/knowhow/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  duplicate: (id) => request(`/knowhow/${id}/duplicate`, { method: 'POST' }),

  pin: (id) => request(`/knowhow/${id}/pin`, { method: 'POST' }),
  unpin: (id) => request(`/knowhow/${id}/unpin`, { method: 'POST' }),

  archive: (id) => request(`/knowhow/${id}/archive`, { method: 'POST' }),
  unarchive: (id) => request(`/knowhow/${id}/unarchive`, { method: 'POST' }),

  remove: (id) => request(`/knowhow/${id}`, { method: 'DELETE' }),

  reorder: (ids) =>
    request('/knowhow/reorder', { method: 'PUT', body: JSON.stringify({ ids }) }),

  // --- Catégories ---
  categories: () => request('/knowhow/categories'),

  createCategory: (data) =>
    request('/knowhow/categories', { method: 'POST', body: JSON.stringify(data) }),

  updateCategory: (id, data) =>
    request(`/knowhow/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  removeCategory: (id) =>
    request(`/knowhow/categories/${id}`, { method: 'DELETE' }),

  reorderCategories: (ids) =>
    request('/knowhow/categories/reorder', { method: 'PUT', body: JSON.stringify({ ids }) }),
};
