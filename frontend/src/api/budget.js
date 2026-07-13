import { request } from './client';

export const budgetApi = {
  overview: (month) =>
    request(`/finances/budget/overview${month ? `?month=${month}` : ''}`),

  cashflow: (month) =>
    request(`/finances/budget/cashflow${month ? `?month=${month}` : ''}`),

  settings: () => request('/finances/budget/settings'),
  updateSettings: (data) =>
    request('/finances/budget/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Catégories (le plan)
  categories: (includeArchived = false) =>
    request(
      `/finances/budget/categories${includeArchived ? '?includeArchived=true' : ''}`,
    ),
  createCategory: (data) =>
    request('/finances/budget/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCategory: (id, data) =>
    request(`/finances/budget/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  archiveCategory: (id) =>
    request(`/finances/budget/categories/${id}/archive`, { method: 'POST' }),
  unarchiveCategory: (id) =>
    request(`/finances/budget/categories/${id}/unarchive`, { method: 'POST' }),
  removeCategory: (id) =>
    request(`/finances/budget/categories/${id}`, { method: 'DELETE' }),
  reorderCategories: (ids) =>
    request('/finances/budget/categories/reorder', {
      method: 'PUT',
      body: JSON.stringify({ ids }),
    }),

  // Plan mensuel (% par catégorie pour un mois)
  plan: (month) => request(`/finances/budget/plan?month=${month}`),
  setPlan: (month, items) =>
    request(`/finances/budget/plan?month=${month}`, {
      method: 'PUT',
      body: JSON.stringify({ items }),
    }),

  // Transactions
  transactions: (month) =>
    request(`/finances/budget/transactions${month ? `?month=${month}` : ''}`),
  createTransaction: (data) =>
    request('/finances/budget/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTransaction: (id, data) =>
    request(`/finances/budget/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  removeTransaction: (id) =>
    request(`/finances/budget/transactions/${id}`, { method: 'DELETE' }),

  // Import bancaire
  imports: () => request('/finances/budget/imports'),
  getImport: (id) => request(`/finances/budget/imports/${id}`),
  uploadImport: (fileName, content) =>
    request('/finances/budget/imports', {
      method: 'POST',
      body: JSON.stringify({ fileName, content }),
    }),
  patchImport: (id, rows) =>
    request(`/finances/budget/imports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ rows }),
    }),
  validateImport: (id, rows) =>
    request(`/finances/budget/imports/${id}/validate`, {
      method: 'POST',
      body: JSON.stringify({ rows }),
    }),
  removeImport: (id) =>
    request(`/finances/budget/imports/${id}`, { method: 'DELETE' }),
};
