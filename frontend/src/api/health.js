import { request } from './client';

const q = (today) => `?today=${encodeURIComponent(today)}`;

export const healthApi = {
  overview: (today) => request(`/health${q(today)}`),

  setMeasurement: (date, data, today) =>
    request(`/health/measurements/${date}${q(today)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  removeMeasurement: (id, today) =>
    request(`/health/measurements/${id}${q(today)}`, { method: 'DELETE' }),

  updateProfile: (data, today) =>
    request(`/health/profile${q(today)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  setGoal: (data, today) =>
    request(`/health/goal${q(today)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  clearGoal: (today) => request(`/health/goal${q(today)}`, { method: 'DELETE' }),
};
