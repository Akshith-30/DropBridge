import { getDeviceId, getDisplayName } from '../utils/deviceIdentity';

const PRESENCE_TYPES = {
  REGISTERED: 'REGISTERED',
  INCOMING_TRANSFER: 'INCOMING_TRANSFER',
  DEVICE_ONLINE: 'DEVICE_ONLINE',
  DEVICE_OFFLINE: 'DEVICE_OFFLINE',
  PRESENCE_SYNC: 'PRESENCE_SYNC',
  ERROR: 'ERROR',
};

let ws = null;
let listeners = new Set();
let reconnectTimer = null;
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

function applyPresenceSync(peers) {
  if (!Array.isArray(peers)) return;
  let changed = false;
  for (const peer of peers) {
    if (peer?.deviceId && !onlinePeers.has(peer.deviceId)) {
      onlinePeers.set(peer.deviceId, peer.displayName || '');
      changed = true;
    } else if (peer?.deviceId) {
      const name = peer.displayName || '';
      if (onlinePeers.get(peer.deviceId) !== name) {
        onlinePeers.set(peer.deviceId, name);
        changed = true;
      }
    }
  }
  if (changed) {
    notifyOnlineListeners();
  }
}

function getPresenceUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const deviceId = encodeURIComponent(getDeviceId());
  const name = encodeURIComponent(getDisplayName() || 'My device');
  return `${protocol}//${window.location.host}/ws/presence?deviceId=${deviceId}&displayName=${name}`;
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
    setPeerOnline(data.deviceId, data.displayName);
  } else if (type === PRESENCE_TYPES.DEVICE_OFFLINE) {
    setPeerOffline(data.deviceId);
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
  if (reconnectTimer) return;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connectPresence();
  }, 3000);
}

export function connectPresence() {
  if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) {
    return;
  }

  try {
    ws = new WebSocket(getPresenceUrl());

    ws.onopen = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handlePresenceMessage(data);
      } catch (err) {
        console.error('Invalid presence message', err);
      }
    };

    ws.onclose = () => {
      ws = null;
      clearOnlinePeers();
      scheduleReconnect();
    };

    ws.onerror = () => {
      ws?.close();
    };
  } catch (err) {
    console.error('Presence connect failed', err);
    scheduleReconnect();
  }
}

export function disconnectPresence() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
  clearOnlinePeers();
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
  disconnectPresence();
  connectPresence();
}

export function isPresenceConnected() {
  return ws?.readyState === WebSocket.OPEN;
}

export { PRESENCE_TYPES };
