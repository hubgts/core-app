import { API_URL } from '../config';

export async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message)
        message = Array.isArray(body.message)
          ? body.message.join(', ')
          : body.message;
    } catch {
      /* corps non JSON, on garde le message par défaut */
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}
