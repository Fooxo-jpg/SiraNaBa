// Central API client. Every request funnels through here so swapping the
// mock layer for a real backend only means changing BASE_URL and removing
// the mock fallback below.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const USE_MOCKS = !BASE_URL; // falls back to in-memory mock data when unset

async function request(path, options = {}) {
  if (USE_MOCKS) {
    const { mockRequest } = await import('../data/mockServer.js');
    return mockRequest(path, options);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, data) => request(path, { method: 'POST', body: JSON.stringify(data) }),
  patch: (path, data) => request(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
