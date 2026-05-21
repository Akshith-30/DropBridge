import { create } from 'zustand';
import { addContact, listContacts, removeContact } from '../services/api';
import { getAccessToken } from './authStore';

/** Avoid hammering GET /contacts — presence WS drives live online state. */
const CONTACTS_MIN_FETCH_MS = 30_000;
let lastFetchedAt = 0;

const useContactsStore = create((set, get) => ({
  contacts: [],
  loading: false,
  loaded: false,

  reset() {
    lastFetchedAt = 0;
    set({ contacts: [], loading: false, loaded: false });
  },

  async loadContacts({ force = false } = {}) {
    if (!getAccessToken()) {
      set({ contacts: [], loaded: true });
      return [];
    }

    const now = Date.now();
    if (!force && get().loaded && now - lastFetchedAt < CONTACTS_MIN_FETCH_MS) {
      return get().contacts;
    }

    set({ loading: true });
    try {
      const res = await listContacts();
      const contacts = res.data || [];
      lastFetchedAt = Date.now();
      set({ contacts, loaded: true });
      return contacts;
    } catch (err) {
      console.error('Failed to load contacts', err);
      set({ contacts: [], loaded: true });
      return [];
    } finally {
      set({ loading: false });
    }
  },

  async addContactByPairing({ name, pairingCode, ownerDeviceId }) {
    const res = await addContact(
      { name, pairingCode },
      ownerDeviceId
    );
    const entry = res.data;
    lastFetchedAt = Date.now();
    set((state) => ({
      contacts: [
        entry,
        ...state.contacts.filter((c) => c.userId !== entry.userId),
      ],
      loaded: true,
    }));
    return entry;
  },

  async removeContactById(contactId) {
    await removeContact(contactId);
    lastFetchedAt = Date.now();
    set((state) => ({
      contacts: state.contacts.filter((c) => c.id !== contactId),
    }));
  },
}));

export default useContactsStore;
