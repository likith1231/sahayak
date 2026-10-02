const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, {
      cache: 'no-store',
      ...options,
      headers,
    });
  } catch {
    // Network-level failure (server asleep/unreachable, or a CORS-blocked response)
    throw new Error("Couldn't reach the server. It may be waking up — please try again in a few seconds.");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage = errorBody;
    try {
      const parsed = JSON.parse(errorBody);
      errorMessage = parsed.error || parsed.detail || errorBody;
    } catch (e) {
      // Ignore
    }
    throw new Error(errorMessage);
  }

  // 204 No Content (e.g. DELETE endpoints) has no body to parse
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const getMandis = () => apiFetch('/api/mandis');
export const getMandi = (id: string) => apiFetch(`/api/mandis/${id}`);
