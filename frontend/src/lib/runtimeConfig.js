/**
 * API / WebSocket base URLs.
 *
 * - Local dev (npm run dev): uses Vite proxy → localhost:8080 when env vars unset.
 * - Production (Vercel): uses VITE_* at build time, or defaults below.
 *
 * Override anytime via Vercel env: VITE_API_BASE_URL, VITE_WS_URL
 */

export const PRODUCTION_API_BASE = 'https://dropbridge-api.onrender.com';
export const PRODUCTION_WS_BASE = 'wss://dropbridge-api.onrender.com';
export const PRODUCTION_FRONTEND_ORIGIN = 'https://drop-bridge-theta.vercel.app';

function trimSlash(url) {
  return url ? url.replace(/\/$/, '') : '';
}

/** Backend origin without /api (e.g. https://dropbridge-api.onrender.com) */
export function getApiBaseOrigin() {
  const fromEnv = trimSlash(import.meta.env.VITE_API_BASE_URL);
  if (fromEnv) return fromEnv;
  if (import.meta.env.DEV) return '';
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
  if (import.meta.env.DEV) return '';
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
  if (import.meta.env.DEV) {
    return 'Cannot reach the server. Start the backend on port 8080 (mvn spring-boot:run).';
  }
  const api = getApiBaseOrigin() || PRODUCTION_API_BASE;
  return `Cannot reach the API at ${api}. If you changed backends, set VITE_API_BASE_URL on Vercel and redeploy.`;
}
