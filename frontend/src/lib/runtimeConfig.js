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
  const fromEnv = trimSlash(import.meta.env.VITE_API_BASE_URL);
  if (fromEnv) return fromEnv;
  if (useLocalBackend()) return '';
  return PRODUCTION_API_BASE;
}

/** Axios baseURL (…/api) */
export function getApiBaseUrl() {
  const origin = getApiBaseOrigin();
  return origin ? `${origin}/api` : '/api';
}

/** WebSocket origin (wss://host, no path) */
export function getWsBaseOrigin() {
  const fromEnv = trimSlash(import.meta.env.VITE_WS_URL);
  if (fromEnv) return fromEnv;
  if (useLocalBackend()) return '';
  return PRODUCTION_WS_BASE;
}

export function buildSignalingWsUrl(sessionId, role) {
  const base = getWsBaseOrigin();
  if (base) {
    return `${base}/ws/signaling?sessionId=${sessionId}&role=${role}`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/signaling?sessionId=${sessionId}&role=${role}`;
}

export function buildPresenceWsUrl(deviceId, displayName) {
  const base = getWsBaseOrigin();
  const q = `deviceId=${encodeURIComponent(deviceId)}&displayName=${encodeURIComponent(displayName)}`;
  if (base) {
    return `${base}/ws/presence?${q}`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/presence?${q}`;
}

export function getNetworkErrorHint() {
  const api = getApiBaseOrigin() || PRODUCTION_API_BASE;
  if (useLocalBackend()) {
    return `Cannot reach the local API. Start the backend: cd backend && mvn spring-boot:run (${api} not used).`;
  }
  return `Cannot reach the API at ${api}. Check Render is live, FRONTEND_URL/CORS on the backend, and redeploy Vercel after env changes.`;
}

/** Call once in dev to confirm which backend is targeted */
export function logRuntimeTargets() {
  if (!import.meta.env.DEV) return;
  console.info('[DropBridge] API →', getApiBaseUrl());
  console.info('[DropBridge] WS  →', getWsBaseOrigin() || '(via Vite proxy)');
}
