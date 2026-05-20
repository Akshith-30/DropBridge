import { create } from 'zustand';
import { listKnownContacts } from '../utils/knownContacts';
import { isDeviceOnline } from '../services/api';
import {
  connectPresence,
  getOnlinePeers,
  isPresenceConnected,
  isPeerOnline,
  onOnlinePeersChange,
} from '../webrtc/presenceClient';

function normalizeId(id) {
  return id?.toLowerCase?.() ?? '';
}

function computeFromPeers(peers) {
  const onlineIds = new Set();
  for (const id of peers.keys()) {
    onlineIds.add(normalizeId(id));
  }
  const contacts = listKnownContacts();
  const onlineMap = {};
  for (const c of contacts) {
    onlineMap[c.deviceId] = onlineIds.has(normalizeId(c.deviceId));
  }
  const onlineCount = Object.values(onlineMap).filter(Boolean).length;
  return { onlineMap, onlineCount };
}

let unsubPresence = null;
let apiRefreshGen = 0;

const useNetworkPresenceStore = create((set, get) => ({
  onlineMap: {},
  onlineCount: 0,
  initialized: false,

  init() {
    if (get().initialized) return;
    set({ initialized: true });

    connectPresence();
    unsubPresence = onOnlinePeersChange((peers) => {
      set(computeFromPeers(peers));
    });
    get().refreshOnlineStatus();
  },

  async refreshOnlineStatus() {
    if (isPresenceConnected()) {
      apiRefreshGen++;
      set(computeFromPeers(getOnlinePeers()));
      return;
    }

    const gen = ++apiRefreshGen;
    const contacts = listKnownContacts();
    if (contacts.length === 0) {
      if (gen === apiRefreshGen) {
        set({ onlineMap: {}, onlineCount: 0 });
      }
      return;
    }

    const entries = await Promise.all(
      contacts.map(async (c) => {
        try {
          const res = await isDeviceOnline(c.deviceId);
          return [c.deviceId, res.data === true];
        } catch {
          return [c.deviceId, false];
        }
      })
    );

    if (gen !== apiRefreshGen) return;

    const onlineMap = Object.fromEntries(entries);
    const onlineCount = Object.values(onlineMap).filter(Boolean).length;
    set({ onlineMap, onlineCount });
  },

  isContactOnline(deviceId) {
    if (isPresenceConnected()) {
      return isPeerOnline(deviceId);
    }
    return get().onlineMap[deviceId] === true;
  },
}));

export default useNetworkPresenceStore;
