import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { useContactOnlineStatus } from '../hooks/useContactOnlineStatus';
import NetworkPanel from './NetworkPanel';

export default function NetworkNavButton() {
  const [open, setOpen] = useState(false);
  const { onlineCount, onlineMap, refreshFromApi } = useContactOnlineStatus();

  useEffect(() => {
    if (open) {
      refreshFromApi();
    }
  }, [open, refreshFromApi]);

  return (
    <>
      <button
        type="button"
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-white/8 bg-white/[0.04] text-white/75 transition-all duration-200 hover:border-white/14 hover:bg-white/8 hover:text-white active:scale-95 max-[479px]:order-first"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          onlineCount > 0
            ? `My network, ${onlineCount} device${onlineCount === 1 ? '' : 's'} online`
            : 'My network'
        }
        id="network-nav-btn"
      >
        <Users className="h-[1.375rem] w-[1.375rem] stroke-[2] text-blue-400" aria-hidden />
        {onlineCount > 0 && (
          <span
            className="absolute -right-1 -top-1 min-w-[1.125rem] rounded-full bg-accent-green px-1 text-center text-[0.625rem] font-bold leading-[1.125rem] text-white shadow-[0_0_0_2px_#0a0a0f]"
            aria-hidden
          >
            {onlineCount > 99 ? '99+' : onlineCount}
          </span>
        )}
      </button>

      {open && (
        <NetworkPanel
          onClose={() => setOpen(false)}
          onContactsChange={refreshFromApi}
          onlineMap={onlineMap}
          onlineCount={onlineCount}
        />
      )}
    </>
  );
}
