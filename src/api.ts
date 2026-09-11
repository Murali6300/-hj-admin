import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// In development, Vite proxy routes /api/* to the backend — use relative URL.
// In production, there is no proxy — use the full backend URL from the env var.
const baseURL = import.meta.env.PROD
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/admin`
  : '/api/v1/admin';

const api = axios.create({ baseURL, timeout: 60_000 });

/* ── Session storage keys ─────────────────────────────────────────── */
const TOKEN_KEY = 'admin_token';
const REFRESH_KEY = 'admin_refresh_token';
const SESSION_KEYS = [TOKEN_KEY, REFRESH_KEY, 'admin_name', 'admin_role', 'admin_remember'];

/**
 * Clears the persisted admin session and sends the user to the login screen.
 * Uses `replace` so the dead session is not left in the browser history.
 * Guarded so that multiple simultaneous failures only trigger a single redirect.
 */
let loggingOut = false;
function forceLogout() {
  if (loggingOut) return;
  loggingOut = true;
  SESSION_KEYS.forEach((k) => localStorage.removeItem(k));
  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
}

/* ── Request interceptor: attach the current access token ─────────── */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && !config.url?.includes('/login')) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ── Single-flight refresh ────────────────────────────────────────── *
 * The backend ROTATES refresh tokens: every successful call to
 * /api/v1/auth/refresh revokes the presented refresh token and returns a
 * brand-new access + refresh pair. So we must:
 *   1. Persist BOTH new tokens (previously only the access token was saved,
 *      which left a revoked refresh token in storage → the next 401 could
 *      not refresh → the admin was silently logged out).
 *   2. De-duplicate concurrent refreshes. The dashboard fires several
 *      requests at once; if each one refreshed independently they would race
 *      and all-but-one would present an already-rotated (revoked) token.
 */
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;

  const refreshBaseURL = import.meta.env.PROD ? import.meta.env.VITE_API_BASE_URL : '';
  const res = await axios.post(
    `${refreshBaseURL}/api/v1/auth/refresh`,
    { refreshToken },
    { timeout: 60_000 },
  );

  const newAccessToken: string | undefined = res.data?.accessToken;
  const newRefreshToken: string | undefined = res.data?.refreshToken;
  if (!newAccessToken) return null;

  localStorage.setItem(TOKEN_KEY, newAccessToken);
  // Persist the rotated refresh token so the NEXT refresh uses a valid one.
  if (newRefreshToken) localStorage.setItem(REFRESH_KEY, newRefreshToken);
  return newAccessToken;
}

/* ── Response interceptor: refresh-on-401, logout only when genuine ── */
api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const originalConfig = err.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const url = originalConfig?.url || '';
    const status = err.response?.status;

    const isLoginRequest = url.includes('/login');
    const isRefreshRequest = url.includes('/refresh');
    const isResetRequest = url.includes('/reset-password') || url.includes('/forgot-password');

    // Only a genuine 401 on an authenticated endpoint is a candidate for
    // refresh/logout. Network errors (no err.response), timeouts, 5xx, 403,
    // etc. are NOT auth failures and must never log the admin out — they are
    // surfaced to the caller so the UI can retry or show an error.
    const isAuthChallenge =
      status === 401 && !isLoginRequest && !isRefreshRequest && !isResetRequest;

    if (!isAuthChallenge || !originalConfig) {
      return Promise.reject(err);
    }

    // No refresh token at all → the session is genuinely gone.
    if (!localStorage.getItem(REFRESH_KEY)) {
      forceLogout();
      return Promise.reject(err);
    }

    // Already retried this exact request once and still got 401 → give up.
    if (originalConfig._retry) {
      forceLogout();
      return Promise.reject(err);
    }
    originalConfig._retry = true;

    try {
      // Share a single refresh across all concurrent 401s.
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;

      if (!newToken) {
        // Refresh produced no token (no/invalid refresh token) → session ended.
        forceLogout();
        return Promise.reject(err);
      }

      // Replay the original request with the fresh access token.
      originalConfig.headers = originalConfig.headers ?? {};
      originalConfig.headers.Authorization = `Bearer ${newToken}`;
      return api(originalConfig);
    } catch (refreshErr) {
      const refreshStatus = (refreshErr as AxiosError)?.response?.status;
      // The refresh token was rejected (expired/revoked) → the session has
      // genuinely expired, so log out. A transient failure (network/timeout/
      // 5xx during refresh) is NOT a session expiry — keep the admin logged in
      // and let them retry.
      if (refreshStatus === 401 || refreshStatus === 403) {
        forceLogout();
      }
      return Promise.reject(refreshErr);
    }
  },
);

export default api;
