const BASE_URL = 'http://localhost:8000';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    cache: 'no-store',
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage = errorBody;
    try {
      const parsed = JSON.parse(errorBody);
      errorMessage = parsed.detail || errorBody;
    } catch (e) {
      // Ignore
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const getMandis = () => apiFetch('/api/mandis');
export const getMandi = (id: string) => apiFetch(`/api/mandis/${id}`);
