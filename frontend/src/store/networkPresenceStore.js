import { create } from 'zustand';
import { getAccessToken } from './authStore';
import useContactsStore from './contactsStore';
import {
  connectPresence,
  disconnectPresence,
  getOnlinePeers,
  isPresenceConnected,
  isPeerOnline,
  onOnlinePeersChange,
  refreshPresenceSync,
} from '../webrtc/presenceClient';

function normalizeId(id) {
  return id?.toLowerCase?.() ?? '';
}

/** Per-device online + count of contacts with at least one device online. */
function computeFromContacts(contacts, peers) {
  const onlineIds = new Set();
  for (const id of peers.keys()) {
    onlineIds.add(normalizeId(id));
  }
  const onlineMap = {};
  let onlineCount = 0;
  for (const c of contacts) {
    let anyOnline = false;
    for (const d of c.devices || []) {
      const on = onlineIds.has(normalizeId(d.deviceId));
      onlineMap[d.deviceId] = on;
      if (on) anyOnline = true;
    }
    if (!anyOnline && c.online === true) {
      anyOnline = true;
    }
    if (anyOnline) {
      onlineCount += 1;
    }
  }
  return { onlineMap, onlineCount };
}

let unsubPresence = null;
let unsubContacts = null;
let apiRefreshGen = 0;

const useNetworkPresenceStore = create((set, get) => ({
  onlineMap: {},
  onlineCount: 0,
  initialized: false,

  init() {
    if (!getAccessToken()) {
      get().teardown();
      return;
    }
    if (get().initialized) {
      if (!isPresenceConnected()) {
        connectPresence();
      }
      return;
    }
    set({ initialized: true });

    connectPresence();
    unsubPresence = onOnlinePeersChange((peers) => {
      const contacts = useContactsStore.getState().contacts;
      set(computeFromContacts(contacts, peers));
    });

    unsubContacts = useContactsStore.subscribe((state, prev) => {
      if (state.loaded && state.contacts !== prev.contacts) {
        set(computeFromContacts(state.contacts, getOnlinePeers()));
      }
    });

    get().refreshOnlineStatus();
  },

  teardown() {
    if (unsubContacts) {
      unsubContacts();
      unsubContacts = null;
    }
    if (unsubPresence) {
      unsubPresence();
      unsubPresence = null;
    }
    set({ initialized: false, onlineMap: {}, onlineCount: 0 });
  },

  async refreshOnlineStatus({ forceContacts = false } = {}) {
    if (!getAccessToken()) {
      set({ onlineMap: {}, onlineCount: 0 });
      return;
    }

    const contactState = useContactsStore.getState();
    let contacts = contactState.contacts;
    const needFetch =
      forceContacts || !contactState.loaded || (contacts.length === 0 && !contactState.loading);

    if (needFetch) {
      contacts = await contactState.loadContacts({ force: forceContacts });
    }

    if (isPresenceConnected()) {
      apiRefreshGen++;
      set(computeFromContacts(contacts, getOnlinePeers()));
      return;
    }

    const gen = ++apiRefreshGen;
    const onlineMap = {};
    let onlineCount = 0;
    for (const c of contacts) {
      let anyOnline = c.online === true;
      for (const d of c.devices || []) {
        if (d.online) {
          onlineMap[d.deviceId] = true;
          anyOnline = true;
        } else {
          onlineMap[d.deviceId] = false;
        }
      }
      if (anyOnline) onlineCount += 1;
    }
    if (gen === apiRefreshGen) {
      set({ onlineMap, onlineCount });
    }
  },

  isContactOnline(deviceId) {
    if (isPresenceConnected()) {
      return isPeerOnline(deviceId);
    }
    return get().onlineMap[deviceId] === true;
  },

  async resyncPresence() {
    if (!getAccessToken()) return;
    if (!isPresenceConnected()) {
      refreshPresenceSync();
    }
    await get().refreshOnlineStatus({ forceContacts: true });
  },
}));

export function onAuthChangeForNetwork() {
  if (getAccessToken()) {
    useNetworkPresenceStore.getState().init();
  } else {
    disconnectPresence();
    useContactsStore.getState().reset();
    useNetworkPresenceStore.getState().teardown();
  }
}

export default useNetworkPresenceStore;
