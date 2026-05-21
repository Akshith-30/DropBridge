/**
 * Deployed DropBridge URLs (also set in frontend/.env and .env.production).
 */
export const PRODUCTION_API_BASE = 'https://dropbridge-api.onrender.com';
export const PRODUCTION_WS_BASE = 'wss://dropbridge-api.onrender.com';
export const PRODUCTION_FRONTEND_ORIGIN = 'https://drop-bridge-theta.vercel.app';

function trimSlash(url) {
  return url ? url.replace(/\/$/, '') : '';
}

function useLocalBackend() {
  return import.meta.env.VITE_USE_LOCAL_BACKEND === 'true';
}

/** Backend origin without /api */
export function getApiBaseOrigin() {
  if (useLocalBackend()) return '';
  const fromEnv = trimSlash(import.meta.env.VITE_API_BASE_URL);
  if (fromEnv) return fromEnv;
  return PRODUCTION_API_BASE;
}

/** Axios baseURL (…/api) */
export function getApiBaseUrl() {
  const origin = getApiBaseOrigin();
  return origin ? `${origin}/api` : '/api';
}

/** WebSocket origin (wss://host, no path) */
export function getWsBaseOrigin() {
  if (useLocalBackend()) return '';
  const fromEnv = trimSlash(import.meta.env.VITE_WS_URL);
  if (fromEnv) return fromEnv;
  return PRODUCTION_WS_BASE;
}

/** Local dev: connect straight to Spring Boot — avoids Vite WS proxy ECONNRESET spam. */
function localDevWsOrigin() {
  if (import.meta.env.DEV && useLocalBackend()) {
    return 'ws://127.0.0.1:8080';
  }
  return '';
}

export function buildSignalingWsUrl(sessionId, role) {
  const local = localDevWsOrigin();
  if (local) {
    return `${local}/ws/signaling?sessionId=${sessionId}&role=${role}`;
  }
  const base = getWsBaseOrigin();
  if (base) {
    return `${base}/ws/signaling?sessionId=${sessionId}&role=${role}`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/signaling?sessionId=${sessionId}&role=${role}`;
}

export function buildPresenceWsUrl(deviceId, displayName, accessToken) {
  let q = `deviceId=${encodeURIComponent(deviceId)}&displayName=${encodeURIComponent(displayName)}`;
  if (accessToken) {
    q += `&token=${encodeURIComponent(accessToken)}`;
  }
  const local = localDevWsOrigin();
  if (local) {
    return `${local}/ws/presence?${q}`;
  }
  const base = getWsBaseOrigin();
  if (base) {
    return `${base}/ws/presence?${q}`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/presence?${q}`;
}

export function getNetworkErrorHint(err) {
  const api = getApiBaseOrigin() || PRODUCTION_API_BASE;
  if (err?.code === 'ECONNABORTED') {
    return `Request to ${api} timed out. Render free tier may be waking up — wait ~30s and try again.`;
  }
  if (useLocalBackend()) {
    return `Cannot reach the local API. Start the backend: cd backend && mvn spring-boot:run (${api} not used).`;
  }
  return `Cannot reach the API at ${api}. Redeploy the Render backend after CORS fixes, then hard-refresh this page.`;
}

export function formatApiError(err, fallback = 'Something went wrong.') {
  if (err?.response?.data?.message) return err.response.data.message;
  if (!err?.response) return getNetworkErrorHint(err);
  return fallback;
}

/** Call once in dev to confirm which backend is targeted */
export function logRuntimeTargets() {
  if (!import.meta.env.DEV) return;
  const mode = useLocalBackend() ? 'LOCAL (Vite → :8080)' : 'REMOTE';
  console.info(`[DropBridge] env: ${mode}`);
  console.info('[DropBridge] API →', getApiBaseUrl());
  console.info('[DropBridge] WS  →', getWsBaseOrigin() || '(via Vite proxy)');
  if (!useLocalBackend()) {
    console.warn(
      '[DropBridge] Not using local backend. For localhost dev, use npm run dev with frontend/.env.development'
    );
  }
}
