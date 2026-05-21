import { useEffect } from 'react';
import { isPresenceConnected } from '../webrtc/presenceClient';
import useAuthStore from '../store/authStore';
import useNetworkPresenceStore from '../store/networkPresenceStore';

/** Shared online status for network badge + panel (single store, no duplicate state). */
export function useContactOnlineStatus() {
  const userId = useAuthStore((s) => s.user?.id);
  const onlineMap = useNetworkPresenceStore((s) => s.onlineMap);
  const onlineCount = useNetworkPresenceStore((s) => s.onlineCount);
  const resyncPresence = useNetworkPresenceStore((s) => s.resyncPresence);
  const isContactOnline = useNetworkPresenceStore((s) => s.isContactOnline);

  useEffect(() => {
    if (userId) {
      useNetworkPresenceStore.getState().init();
    } else {
      useNetworkPresenceStore.getState().teardown();
    }

    const fallbackInterval = setInterval(() => {
      if (userId && !isPresenceConnected()) {
        useNetworkPresenceStore.getState().refreshOnlineStatus();
      }
    }, 60_000);

    return () => clearInterval(fallbackInterval);
  }, [userId]);

  const refreshFromApi = () =>
    useNetworkPresenceStore.getState().refreshOnlineStatus({ forceContacts: true });

  return {
    onlineMap,
    onlineCount,
    isContactOnline,
    refreshFromApi,
    resyncPresence,
  };
}
