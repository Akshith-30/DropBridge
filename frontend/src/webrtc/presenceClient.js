import { getDeviceId, getDisplayName } from '../utils/deviceIdentity';
import { getAccessToken } from '../store/authStore';
import useContactsStore from '../store/contactsStore';
import { buildPresenceWsUrl } from '../lib/runtimeConfig';

const PRESENCE_TYPES = {
  REGISTERED: 'REGISTERED',
  INCOMING_TRANSFER: 'INCOMING_TRANSFER',
  DEVICE_ONLINE: 'DEVICE_ONLINE',
  DEVICE_OFFLINE: 'DEVICE_OFFLINE',
  PRESENCE_SYNC: 'PRESENCE_SYNC',
  ERROR: 'ERROR',
};

/** The one socket we consider active (never cleared by a stale socket's onclose). */
let ws = null;
let listeners = new Set();
let reconnectTimer = null;
let clearPeersTimer = null;
let lastConnectionKey = null;
let reconnectAttempt = 0;
let intentionalClose = false;
const incomingTransferHandlers = new Set();

/** deviceId -> displayName (peers currently online per presence hub) */
const onlinePeers = new Map();
const onlineListeners = new Set();

export function normalizePresenceType(type) {
  return typeof type === 'string' ? type.toUpperCase() : type;
}

function notifyOnlineListeners() {
  onlineListeners.forEach((fn) => {
    try {
      fn(onlinePeers);
    } catch (err) {
      console.error('Online presence listener error', err);
    }
  });
}

function setPeerOnline(deviceId, displayName) {
  if (!deviceId) return;
  onlinePeers.set(deviceId, displayName || '');
  notifyOnlineListeners();
}

function setPeerOffline(deviceId) {
  if (!deviceId) return;
  if (onlinePeers.delete(deviceId)) {
    notifyOnlineListeners();
  }
}

function clearOnlinePeers() {
  if (onlinePeers.size === 0) return;
  onlinePeers.clear();
  notifyOnlineListeners();
}

function connectionKey() {
  return `${getDeviceId()}|${getAccessToken() || 'guest'}`;
}

function allowedPeerIds() {
  if (!getAccessToken()) return null;
  const { contacts, loaded } = useContactsStore.getState();
  if (!loaded) return null;
  const ids = new Set();
  for (const contact of contacts) {
    for (const device of contact.devices || []) {
      if (device.deviceId) {
        ids.add(device.deviceId.toLowerCase());
      }
    }
  }
  return ids;
}

/** Replace local online set with server snapshot (authoritative). */
function applyPresenceSync(peers) {
  const allowed = allowedPeerIds();
  onlinePeers.clear();
  if (Array.isArray(peers)) {
    for (const peer of peers) {
      if (allowed && peer?.deviceId && !allowed.has(peer.deviceId.toLowerCase())) {
        continue;
      }
      if (peer?.deviceId) {
        onlinePeers.set(peer.deviceId, peer.displayName || '');
      }
    }
  }
  notifyOnlineListeners();
}

function getPresenceUrl() {
  return buildPresenceWsUrl(
    getDeviceId(),
    getDisplayName() || 'My device',
    getAccessToken() || undefined
  );
}

function notifyListeners(message) {
  listeners.forEach((fn) => {
    try {
      fn(message);
    } catch (err) {
      console.error('Presence listener error', err);
    }
  });
}

function handlePresenceMessage(data) {
  const type = normalizePresenceType(data.type);

  if (type === PRESENCE_TYPES.DEVICE_ONLINE) {
    const allowed = allowedPeerIds();
    if (!allowed || (data.deviceId && allowed.has(data.deviceId.toLowerCase()))) {
      setPeerOnline(data.deviceId, data.displayName);
    }
  } else if (type === PRESENCE_TYPES.DEVICE_OFFLINE) {
    const allowed = allowedPeerIds();
    if (!allowed || (data.deviceId && allowed.has(data.deviceId.toLowerCase()))) {
      setPeerOffline(data.deviceId);
    }
  } else if (type === PRESENCE_TYPES.PRESENCE_SYNC) {
    applyPresenceSync(data.onlinePeers);
  }

  if (type === PRESENCE_TYPES.INCOMING_TRANSFER) {
    incomingTransferHandlers.forEach((handler) => {
      try {
        handler(data);
      } catch (err) {
        console.error('Incoming transfer handler error', err);
      }
    });
  }

  notifyListeners({ ...data, type });
}

function scheduleReconnect() {
  if (reconnectTimer || intentionalClose) return;
  const delay = Math.min(30000, 2000 * 2 ** reconnectAttempt);
  reconnectAttempt += 1;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connectPresence();
  }, delay);
}

function cancelReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

/** Close a socket without touching the global `ws` (avoids stale onclose wiping a newer connection). */
function closeSocket(socket, { intentional = true } = {}) {
  if (!socket) return;
  if (intentional) {
    intentionalClose = true;
  }
  try {
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
  } catch {
    /* ignore */
  }
}

function bindSocketHandlers(socket, key) {
  socket.onopen = () => {
    if (ws !== socket) return;
    reconnectAttempt = 0;
    if (clearPeersTimer) {
      clearTimeout(clearPeersTimer);
      clearPeersTimer = null;
    }
    cancelReconnectTimer();
  };

  socket.onmessage = (event) => {
    if (ws !== socket) return;
    try {
      const data = JSON.parse(event.data);
      handlePresenceMessage(data);
    } catch (err) {
      console.error('Invalid presence message', err);
    }
  };

  socket.onclose = () => {
    if (ws !== socket) return;
    ws = null;
    lastConnectionKey = null;
    const shouldReconnect = !intentionalClose;
    intentionalClose = false;
    if (clearPeersTimer) clearTimeout(clearPeersTimer);
    clearPeersTimer = window.setTimeout(() => {
      clearPeersTimer = null;
      clearOnlinePeers();
    }, 2500);
    if (shouldReconnect) {
      scheduleReconnect();
    }
  };

  socket.onerror = () => {
    if (ws === socket) {
      socket.close();
    }
  };
}

export function connectPresence() {
  const key = connectionKey();
  if (ws?.readyState === WebSocket.OPEN && lastConnectionKey === key) {
    return;
  }
  if (ws?.readyState === WebSocket.CONNECTING && lastConnectionKey === key) {
    return;
  }

  cancelReconnectTimer();

  const previous = ws;
  lastConnectionKey = key;
  intentionalClose = false;

  const socket = new WebSocket(getPresenceUrl());
  ws = socket;
  bindSocketHandlers(socket, key);

  if (previous && previous !== socket) {
    closeSocket(previous, { intentional: true });
    intentionalClose = false;
  }
}

export function disconnectPresence() {
  intentionalClose = true;
  reconnectAttempt = 0;
  cancelReconnectTimer();
  if (clearPeersTimer) {
    clearTimeout(clearPeersTimer);
    clearPeersTimer = null;
  }
  const current = ws;
  ws = null;
  lastConnectionKey = null;
  if (current) {
    closeSocket(current, { intentional: true });
  }
  clearOnlinePeers();
  intentionalClose = false;
}

/** Reconnect only when auth/device identity changed or the socket is down. */
export function refreshPresenceSync() {
  const key = connectionKey();
  if (ws?.readyState === WebSocket.OPEN && key === lastConnectionKey) {
    return;
  }
  reconnectPresence();
}

export function onPresenceMessage(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Subscribe to live online/offline updates. Callback receives the online peers Map. */
export function onOnlinePeersChange(listener) {
  onlineListeners.add(listener);
  listener(onlinePeers);
  return () => onlineListeners.delete(listener);
}

export function isPeerOnline(deviceId) {
  if (!deviceId) return false;
  const norm = deviceId.toLowerCase();
  for (const id of onlinePeers.keys()) {
    if (id.toLowerCase() === norm) return true;
  }
  return false;
}

export function getOnlinePeers() {
  return onlinePeers;
}

/** Register for INCOMING_TRANSFER push messages. Returns unsubscribe. */
export function onIncomingTransfer(handler) {
  incomingTransferHandlers.add(handler);
  return () => incomingTransferHandlers.delete(handler);
}

/** @deprecated Use onIncomingTransfer(handler) which returns unsubscribe */
export function setOnIncomingTransfer(handler) {
  incomingTransferHandlers.clear();
  if (handler) {
    incomingTransferHandlers.add(handler);
  }
}

export function reconnectPresence() {
  if (ws) {
    closeSocket(ws, { intentional: true });
    intentionalClose = false;
  }
  connectPresence();
}

export function isPresenceConnected() {
  return ws?.readyState === WebSocket.OPEN;
}

export { PRESENCE_TYPES };
