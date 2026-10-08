/* ============================================================
   API CLIENT — centralized HTTP client
   
   Toggle between real API and mock data:
     - Set USE_MOCK = true  → returns hardcoded mock data
     - Set USE_MOCK = false → calls real backend via Gateway
   
   Auto-injects JWT token from localStorage into Authorization header.
   ============================================================ */

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8080/api/v1';

/** Toggle: true = mock data, false = real backend */
export const USE_MOCK = false;

/**
 * Get stored auth token for API requests.
 */
function getAuthToken() {
  return localStorage.getItem('ds_access_token');
}

/**
 * Core fetch wrapper with:
 *   - JSON content type
 *   - Auto-inject Authorization: Bearer token
 *   - Response unwrapping (expects { message, data, info, status })
 *   - Error classification
 *   - Timeout (30s default)
 */
async function request(method, path, body = null, options = {}) {
  const url = `${API_BASE}${path}`;
  const timeout = options.timeout || 30000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const isMultipart = typeof FormData !== 'undefined' && body instanceof FormData;
    const headers = {
      ...(isMultipart ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    };

    // Auto-inject auth token unless explicitly skipped
    if (!options.skipAuth) {
      const token = getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const fetchOptions = {
      method,
      headers,
      signal: controller.signal,
    };

    if (body !== null && method !== 'GET') {
      fetchOptions.body = isMultipart ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    // Handle non-JSON responses (204 No Content, etc.)
    if (response.status === 204) {
      return { message: 'Success', data: null, info: null, status: 204 };
    }

    const json = await response.json();

    // Handle 401 — token expired
    if (response.status === 401 && json?.status === 'TOKEN_EXPIRED') {
      // Could trigger token refresh here in the future
      // For now, redirect to login
      localStorage.removeItem('ds_access_token');
      localStorage.removeItem('ds_refresh_token');
      localStorage.removeItem('ds_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new ApiError('Session expired. Please log in again.', 401);
    }

    // Handle 403 — permission denied (parse the missing permission from response)
    if (response.status === 403) {
      const json = await response.json().catch(() => ({}));
      throw new ApiError(
        json.message || 'Access denied',
        403,
        json.info || null   // { missingPermission: "pipeline:create" }
      );
    }

    if (!response.ok) {
      throw new ApiError(
        json.message || `Request failed with status ${response.status}`,
        response.status,
        json.info
      );
    }

    return json;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out', 408);
    }
    if(error.message == 'Failed to fetch') {
      throw new ApiError('Network error — is the backend running?', 500);
    }
    throw new ApiError(error.message, error.status || 500);
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Typed API error with status code and optional info */
export class ApiError extends Error {
  constructor(message, status, info = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.info = info;
  }
}

/* ============================================================
   HTTP METHOD SHORTCUTS
   ============================================================ */

export const apiClient = {
  get:    (path, options)       => request('GET', path, null, options),
  post:   (path, body, options) => request('POST', path, body, options),
  put:    (path, body, options) => request('PUT', path, body, options),
  delete: (path, options)       => request('DELETE', path, null, options),
  upload: (path, formData, options) => request('POST', path, formData, options),
  API_BASE
};