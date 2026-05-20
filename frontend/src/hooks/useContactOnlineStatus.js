import { useEffect } from 'react';
import { isPresenceConnected } from '../webrtc/presenceClient';
import useNetworkPresenceStore from '../store/networkPresenceStore';

/** Shared online status for network badge + panel (single store, no duplicate state). */
export function useContactOnlineStatus() {
  const onlineMap = useNetworkPresenceStore((s) => s.onlineMap);
  const onlineCount = useNetworkPresenceStore((s) => s.onlineCount);
  const init = useNetworkPresenceStore((s) => s.init);
  const refreshOnlineStatus = useNetworkPresenceStore((s) => s.refreshOnlineStatus);
  const isContactOnline = useNetworkPresenceStore((s) => s.isContactOnline);

  useEffect(() => {
    init();

    const fallbackInterval = setInterval(() => {
      if (!isPresenceConnected()) {
        refreshOnlineStatus();
      }
    }, 30000);

    return () => clearInterval(fallbackInterval);
  }, [init, refreshOnlineStatus]);

  return {
    onlineMap,
    onlineCount,
    isContactOnline,
    refreshFromApi: refreshOnlineStatus,
  };
}
