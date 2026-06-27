import { request } from './client';

const body = (data) => ({ body: JSON.stringify(data) });

export const courseApi = {
  // --- Rayons ---
  aisles: () => request('/course/aisles'),
  createAisle: (data) => request('/course/aisles', { method: 'POST', ...body(data) }),
  updateAisle: (id, data) =>
    request(`/course/aisles/${id}`, { method: 'PATCH', ...body(data) }),
  removeAisle: (id) => request(`/course/aisles/${id}`, { method: 'DELETE' }),
  reorderAisles: (ids) =>
    request('/course/aisles/reorder', { method: 'PUT', ...body({ ids }) }),

  // --- Articles ---
  articles: (q = '') => request(`/course/articles?q=${encodeURIComponent(q)}`),
  createArticle: (data) => request('/course/articles', { method: 'POST', ...body(data) }),
  updateArticle: (id, data) =>
    request(`/course/articles/${id}`, { method: 'PATCH', ...body(data) }),
  removeArticle: (id) => request(`/course/articles/${id}`, { method: 'DELETE' }),

  // --- Listes ---
  lists: () => request('/course/lists'),
  getList: (id) => request(`/course/lists/${id}`),
  createList: (data) => request('/course/lists', { method: 'POST', ...body(data) }),
  updateList: (id, data) =>
    request(`/course/lists/${id}`, { method: 'PATCH', ...body(data) }),
  duplicateList: (id) => request(`/course/lists/${id}/duplicate`, { method: 'POST' }),
  removeList: (id) => request(`/course/lists/${id}`, { method: 'DELETE' }),
  reorderLists: (ids) =>
    request('/course/lists/reorder', { method: 'PUT', ...body({ ids }) }),
  uncheckAll: (id) => request(`/course/lists/${id}/uncheck-all`, { method: 'POST' }),
  clearChecked: (id) => request(`/course/lists/${id}/checked`, { method: 'DELETE' }),
  saveAsTemplate: (id, data) =>
    request(`/course/lists/${id}/save-as-template`, { method: 'POST', ...body(data) }),
  applyTemplate: (id, templateId) =>
    request(`/course/lists/${id}/apply-template/${templateId}`, { method: 'POST' }),

  // --- Items ---
  addItem: (listId, data) =>
    request(`/course/lists/${listId}/items`, { method: 'POST', ...body(data) }),
  updateItem: (listId, itemId, data) =>
    request(`/course/lists/${listId}/items/${itemId}`, { method: 'PATCH', ...body(data) }),
  toggleItem: (listId, itemId) =>
    request(`/course/lists/${listId}/items/${itemId}/toggle`, { method: 'POST' }),
  removeItem: (listId, itemId) =>
    request(`/course/lists/${listId}/items/${itemId}`, { method: 'DELETE' }),
  reorderItems: (listId, ids) =>
    request(`/course/lists/${listId}/items/reorder`, { method: 'PUT', ...body({ ids }) }),

  // --- Modèles ---
  templates: () => request('/course/templates'),
  getTemplate: (id) => request(`/course/templates/${id}`),
  createTemplate: (data) => request('/course/templates', { method: 'POST', ...body(data) }),
  updateTemplate: (id, data) =>
    request(`/course/templates/${id}`, { method: 'PATCH', ...body(data) }),
  removeTemplate: (id) => request(`/course/templates/${id}`, { method: 'DELETE' }),
  instantiateTemplate: (templateId, data) =>
    request(`/course/lists/from-template/${templateId}`, { method: 'POST', ...body(data) }),

  // --- Import recette ---
  previewRecipe: (recipeId, servings) =>
    request(`/course/recipes/${recipeId}/preview${servings != null ? `?servings=${servings}` : ''}`),
  importRecipe: (listId, data) =>
    request(`/course/lists/${listId}/import-recipe`, { method: 'POST', ...body(data) }),
  createListFromRecipe: (data) =>
    request('/course/lists/from-recipe', { method: 'POST', ...body(data) }),
};
