import { useAuthStore } from '@/stores/authStore';

const API_BASE = '/api/v1';

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;
  const url = `${API_BASE}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  // Add auth token if available and not skipped
  if (!skipAuth) {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: 'include', // Send cookies
  });

  // Handle 401 - try refresh
  if (response.status === 401 && !skipAuth && !endpoint.includes('/auth/')) {
    const refreshed = await refreshToken();
    if (refreshed) {
      // Retry with new token
      const newToken = useAuthStore.getState().accessToken;
      (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
      const retryResponse = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: 'include',
      });
      return handleResponse<T>(retryResponse);
    } else {
      // Refresh failed - logout
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
      throw new ApiError('Session expired', 401, 'SESSION_EXPIRED');
    }
  }

  return handleResponse<T>(response);
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('Content-Type');
  const isJson = contentType?.includes('application/json');

  if (!response.ok) {
    const error = isJson ? await response.json() : { error: response.statusText };
    throw new ApiError(
      error.error || 'Request failed',
      response.status,
      error.code,
      error.details
    );
  }

  if (response.status === 204 || !isJson) {
    return {} as T;
  }

  return response.json();
}

async function refreshToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) return false;

    const data = await response.json();
    if (data.tokens?.accessToken) {
      // Token is set via cookie, but also update store
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        useAuthStore.getState().setUser(currentUser, data.tokens.accessToken);
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// API methods
export const api = {
  get: <T>(endpoint: string, options?: ApiOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown, options?: ApiOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown, options?: ApiOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown, options?: ApiOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string, options?: ApiOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),

  /**
   * Stream a response using Server-Sent Events (SSE)
   * Used for streaming AI responses
   */
  stream: (
    endpoint: string,
    data: unknown,
    callbacks: {
      onMessage: (chunk: string) => void;
      onError?: (error: Error) => void;
      onComplete?: () => void;
    }
  ): AbortController => {
    const controller = new AbortController();
    const token = useAuthStore.getState().accessToken;

    fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
      signal: controller.signal,
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new ApiError(
            'Stream request failed',
            response.status,
            'STREAM_ERROR'
          );
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                callbacks.onComplete?.();
                return;
              }
              try {
                const parsed = JSON.parse(data);
                callbacks.onMessage(parsed.content || parsed.text || data);
              } catch {
                callbacks.onMessage(data);
              }
            }
          }
        }

        callbacks.onComplete?.();
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          callbacks.onError?.(error);
        }
      });

    return controller;
  },
};

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{
      user: { id: string; email: string; firstName: string; lastName: string; tenantId: string };
      tokens: { accessToken: string; expiresIn: number };
    }>('/auth/login', { email, password }, { skipAuth: true }),

  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) =>
    api.post<{
      user: { id: string; email: string; firstName: string; lastName: string; tenantId: string };
      tokens: { accessToken: string; expiresIn: number };
    }>('/auth/register', data, { skipAuth: true }),

  logout: () => api.post('/auth/logout'),

  logoutAll: () => api.post('/auth/logout-all'),

  me: () =>
    api.get<{
      user: { id: string; email: string; firstName: string; lastName: string; tenantId: string; roles: string[]; permissions: string[] };
    }>('/auth/me'),
};

export { ApiError };

