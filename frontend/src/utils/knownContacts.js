const CONTACTS_KEY = 'dropbridge_known_contacts';

function loadContacts() {
  try {
    const raw = localStorage.getItem(CONTACTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveContacts(contacts) {
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

export function listKnownContacts() {
  return loadContacts().sort((a, b) => (b.lastTransferAt || 0) - (a.lastTransferAt || 0));
}

export function upsertKnownContact({ deviceId, name, pairingCode }) {
  if (!deviceId || !name?.trim()) return null;

  const contacts = loadContacts();
  const code = pairingCode || deviceId.replace(/-/g, '').slice(0, 8).toUpperCase();
  const existing = contacts.find((c) => c.deviceId === deviceId);
  const entry = {
    id: existing?.id || crypto.randomUUID(),
    deviceId,
    name: name.trim().slice(0, 80),
    pairingCode: code,
    addedAt: existing?.addedAt || Date.now(),
    lastTransferAt: Date.now(),
  };

  const next = existing
    ? contacts.map((c) => (c.deviceId === deviceId ? entry : c))
    : [...contacts, entry];

  saveContacts(next);
  return entry;
}

export function removeKnownContact(id) {
  saveContacts(loadContacts().filter((c) => c.id !== id));
}

export function findKnownContact(deviceId) {
  return loadContacts().find((c) => c.deviceId === deviceId) || null;
}
