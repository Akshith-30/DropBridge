const DEVICE_ID_KEY = 'dropbridge_device_id';
const DISPLAY_NAME_KEY = 'dropbridge_display_name';

export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function getDisplayName() {
  return localStorage.getItem(DISPLAY_NAME_KEY) || '';
}

export function setDisplayName(name) {
  const trimmed = name?.trim() || '';
  if (trimmed) {
    localStorage.setItem(DISPLAY_NAME_KEY, trimmed.slice(0, 80));
  } else {
    localStorage.removeItem(DISPLAY_NAME_KEY);
  }
}

export function getPairingCode(deviceId = getDeviceId()) {
  return deviceId.replace(/-/g, '').slice(0, 8).toUpperCase();
}
