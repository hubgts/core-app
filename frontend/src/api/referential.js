import { request } from './client';

export const referentialApi = {
  list: (kind, q = '') =>
    request(`/referential/${kind}?q=${encodeURIComponent(q)}`),

  create: (kind, name) =>
    request(`/referential/${kind}`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  update: (kind, id, name) =>
    request(`/referential/${kind}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  remove: (kind, id) =>
    request(`/referential/${kind}/${id}`, { method: 'DELETE' }),
};
