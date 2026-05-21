import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** Dev-only: backend restarts / slow boot cause ECONNRESET on the WS proxy — safe to ignore. */
function quietWsProxy(proxy) {
  proxy.on('error', () => {});
  proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
    socket.on('error', () => {});
  });
}

/** Suppress noisy Vite WS proxy logs when something still hits /ws via the dev server. */
function suppressWsProxyLogs() {
  return {
    name: 'suppress-ws-proxy-logs',
    configureServer(server) {
      const logger = server.config.logger;
      const origError = logger.error.bind(logger);
      const origWarn = logger.warn.bind(logger);
      const skip = (msg) =>
        typeof msg === 'string' &&
        (msg.includes('ws proxy') || msg.includes('ws proxy socket'));
      logger.error = (msg, options) => {
        if (skip(msg)) return;
        origError(msg, options);
      };
      logger.warn = (msg, options) => {
        if (skip(msg)) return;
        origWarn(msg, options);
      };
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    suppressWsProxyLogs(),
  ],
  server: {
    port: 5173,
    strictPort: false, // if 5173 is busy, Vite uses 5174+ (backend adapts via X-Frontend-Origin)
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
        configure: quietWsProxy,
      },
    },
  },
})
