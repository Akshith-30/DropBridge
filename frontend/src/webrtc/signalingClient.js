import { SIGNALING_MESSAGE_TYPES } from './constants';

/**
 * Build the WebSocket signaling URL.
 *
 * Dev:        uses window.location.host (Vite proxies WS to :8080)
 * Production: uses VITE_WS_URL env var, e.g. wss://dropbridge-api.onrender.com
 */
function getSignalingUrl(sessionId, role) {
  if (import.meta.env.VITE_WS_URL) {
    const base = import.meta.env.VITE_WS_URL.replace(/\/$/, '');
    return `${base}/ws/signaling?sessionId=${sessionId}&role=${role}`;
  }
  // Dev fallback: derive from current page origin
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}/ws/signaling?sessionId=${sessionId}&role=${role}`;
}

export class SignalingClient {
  constructor({ sessionId, role, onMessage, onOpen, onClose, onError }) {
    this.sessionId = sessionId;
    this.role = role;
    this.onMessage = onMessage;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.onError = onError;
    this.ws = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(getSignalingUrl(this.sessionId, this.role));

      this.ws.onopen = () => {
        this.send({ type: SIGNALING_MESSAGE_TYPES.JOIN, sessionId: this.sessionId, role: this.role });
        this.onOpen?.();
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.onMessage?.(data);
        } catch (err) {
          console.error('Invalid signaling message', err);
        }
      };

      this.ws.onerror = (event) => {
        this.onError?.(event);
        reject(new Error('Signaling connection failed'));
      };

      this.ws.onclose = () => {
        this.onClose?.();
      };
    });
  }

  send(message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
