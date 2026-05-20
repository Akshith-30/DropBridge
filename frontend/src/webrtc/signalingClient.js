import { SIGNALING_MESSAGE_TYPES } from './constants';
import { buildSignalingWsUrl } from '../lib/runtimeConfig';

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
      this.ws = new WebSocket(buildSignalingWsUrl(this.sessionId, this.role));

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
