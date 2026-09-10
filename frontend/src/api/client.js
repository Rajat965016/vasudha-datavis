import axios from 'axios';

const TOKEN_STORAGE_KEY = 'vasudha.auth.token';

export const getStoredToken = () => {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const setStoredToken = (token) => {
  try {
    if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* storage unavailable (private mode) — the session simply won't persist */
  }
};

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api',
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Signals the auth context that the stored token is no longer valid. */
export const UNAUTHORIZED_EVENT = 'vasudha:unauthorized';

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isAuthCall = error.config?.url?.includes('/auth/login');

    if (status === 401 && !isAuthCall) {
      setStoredToken(null);
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  },
);

/**
 * Normalises any axios failure into `{ message, errors, details }` so every
 * screen can render backend validation feedback the same way.
 */
export const toApiError = (error) => {
  const payload = error?.response?.data;
  const details = payload?.details ?? {};

  return {
    status: error?.response?.status ?? 0,
    message:
      payload?.message ??
      (error?.code === 'ECONNABORTED'
        ? 'The request timed out. Please try again.'
        : 'Unable to reach the server. Please check your connection and try again.'),
    /** Field-level issues from Zod validation. */
    fieldErrors: details.errors?.filter((issue) => issue.field) ?? [],
    /** Row-level issues from CSV parsing. */
    rowErrors: details.errors?.filter((issue) => issue.row !== undefined) ?? [],
    missingColumns: details.missingColumns ?? [],
    foundColumns: details.foundColumns ?? [],
  };
};

export default apiClient;
