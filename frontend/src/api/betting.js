import { request } from './client';

export const bettingApi = {
  // Bankrolls
  bankrolls: () => request('/betting/bankrolls'),
  bankroll: (id) => request(`/betting/bankrolls/${id}`),
  createBankroll: (data) =>
    request('/betting/bankrolls', { method: 'POST', body: JSON.stringify(data) }),
  updateBankroll: (id, data) =>
    request(`/betting/bankrolls/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  archiveBankroll: (id) =>
    request(`/betting/bankrolls/${id}/archive`, { method: 'POST' }),
  removeBankroll: (id) =>
    request(`/betting/bankrolls/${id}`, { method: 'DELETE' }),

  // Paris
  createBet: (bankrollId, data) =>
    request(`/betting/bankrolls/${bankrollId}/bets`, { method: 'POST', body: JSON.stringify(data) }),
  updateBet: (id, data) =>
    request(`/betting/bets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  settleBet: (id, data) =>
    request(`/betting/bets/${id}/settle`, { method: 'POST', body: JSON.stringify(data) }),
  settleSelection: (id, status) =>
    request(`/betting/selections/${id}/settle`, { method: 'POST', body: JSON.stringify({ status }) }),
  removeBet: (id) =>
    request(`/betting/bets/${id}`, { method: 'DELETE' }),
};
