/**
 * Wait until the Vite /api proxy can reach the Spring backend (avoids WS proxy spam on startup).
 */
export async function waitForBackend({ maxAttempts = 40, intervalMs = 500 } = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch('/api/devices/__health__/online', {
        method: 'GET',
        cache: 'no-store',
      });
      // Any HTTP response means the backend accepted the connection (404/200 both OK).
      if (res.status < 502) {
        return true;
      }
    } catch {
      // Proxy refused / backend still booting
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}
