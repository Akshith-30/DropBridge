/** True if any device for this contact is in the online map. */
export function isContactOnline(contact, onlineMap) {
  if (!contact) return false;
  if (contact.online === true) return true;
  return (contact.devices || []).some((d) => onlineMap[d.deviceId] === true);
}

export function contactOnlineLabel(contact, onlineMap) {
  const devices = contact.devices || [];
  const onlineN = devices.filter((d) => onlineMap[d.deviceId] === true).length;
  if (onlineN === 0) return 'Offline';
  if (devices.length <= 1) return 'Online';
  return `${onlineN} device${onlineN === 1 ? '' : 's'} online`;
}

export function contactInitials(name) {
  const trimmed = name?.trim() || '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}
