import { request } from './client';

export const alimentationApi = {
  // --- Recettes ---
  list: (includeArchived = false) =>
    request(`/alimentation/recipes${includeArchived ? '?includeArchived=true' : ''}`),

  get: (id) => request(`/alimentation/recipes/${id}`),

  create: (data) =>
    request('/alimentation/recipes', { method: 'POST', body: JSON.stringify(data) }),

  update: (id, data) =>
    request(`/alimentation/recipes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  duplicate: (id) => request(`/alimentation/recipes/${id}/duplicate`, { method: 'POST' }),

  pin: (id) => request(`/alimentation/recipes/${id}/pin`, { method: 'POST' }),
  unpin: (id) => request(`/alimentation/recipes/${id}/unpin`, { method: 'POST' }),

  archive: (id) => request(`/alimentation/recipes/${id}/archive`, { method: 'POST' }),
  unarchive: (id) => request(`/alimentation/recipes/${id}/unarchive`, { method: 'POST' }),

  remove: (id) => request(`/alimentation/recipes/${id}`, { method: 'DELETE' }),

  reorder: (ids) =>
    request('/alimentation/recipes/reorder', { method: 'PUT', body: JSON.stringify({ ids }) }),

  // --- Types de repas ---
  mealTypes: () => request('/alimentation/meal-types'),

  createMealType: (data) =>
    request('/alimentation/meal-types', { method: 'POST', body: JSON.stringify(data) }),

  updateMealType: (id, data) =>
    request(`/alimentation/meal-types/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  removeMealType: (id) =>
    request(`/alimentation/meal-types/${id}`, { method: 'DELETE' }),

  reorderMealTypes: (ids) =>
    request('/alimentation/meal-types/reorder', { method: 'PUT', body: JSON.stringify({ ids }) }),
};
