import { request } from './client';

export const trainingApi = {
  events: (from, to) => request(`/training/events?from=${from}&to=${to}`),

  event: (id) => request(`/training/events/${id}`),

  exerciseNames: (q = '') =>
    request(`/training/exercises/names?q=${encodeURIComponent(q)}`),

  // Stats agrégées : encore consommées par le Dashboard (résumé jour/semaine).
  stats: (from, to) => request(`/training/stats?from=${from}&to=${to}`),

  create: (data) =>
    request('/training/events', { method: 'POST', body: JSON.stringify(data) }),

  update: (id, data) =>
    request(`/training/events/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  remove: (id) => request(`/training/events/${id}`, { method: 'DELETE' }),

  // --- Templates (modèles de séance réutilisables) ---

  templates: (q = '', type = '') => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (type) params.set('type', type);
    const qs = params.toString();
    return request(`/training/templates${qs ? `?${qs}` : ''}`);
  },

  template: (id) => request(`/training/templates/${id}`),

  createTemplate: (data) =>
    request('/training/templates', { method: 'POST', body: JSON.stringify(data) }),

  updateTemplate: (id, data) =>
    request(`/training/templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  removeTemplate: (id) => request(`/training/templates/${id}`, { method: 'DELETE' }),

  // --- Programmes / cycles ---

  programs: (q = '') =>
    request(`/training/programs${q ? `?q=${encodeURIComponent(q)}` : ''}`),

  program: (id) => request(`/training/programs/${id}`),

  createProgram: (data) =>
    request('/training/programs', { method: 'POST', body: JSON.stringify(data) }),

  updateProgram: (id, data) =>
    request(`/training/programs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  removeProgram: (id) => request(`/training/programs/${id}`, { method: 'DELETE' }),

  previewProgram: (id, startDate) =>
    request(`/training/programs/${id}/preview?startDate=${encodeURIComponent(startDate)}`),

  startProgram: (id, startDate) =>
    request(`/training/programs/${id}/start`, {
      method: 'POST',
      body: JSON.stringify({ startDate }),
    }),
};
