import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { useContactOnlineStatus } from '../hooks/useContactOnlineStatus';
import NetworkPanel from './NetworkPanel';
import { cn } from '../lib/cn';

/** Persistent “My Network” pill with online badge (signed-in navbar). */
export default function NetworkNavButton() {
  const [open, setOpen] = useState(false);
  const { onlineCount, onlineMap, refreshFromApi, resyncPresence } = useContactOnlineStatus();

  useEffect(() => {
    if (open) {
      void resyncPresence();
    }
  }, [open, resyncPresence]);

  return (
    <>
      <button
        type="button"
        className={cn(
          'relative inline-flex min-h-10 items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 py-2 text-sm font-medium text-white/90 transition-all duration-200',
          'hover:border-white/18 hover:bg-white/10 active:scale-[0.98]'
        )}
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          onlineCount > 0
            ? `My network, ${onlineCount} contact${onlineCount === 1 ? '' : 's'} online`
            : 'My network'
        }
        id="network-nav-btn"
      >
        <Users className="h-[1.125rem] w-[1.125rem] shrink-0 text-accent-blue" aria-hidden />
        <span className="hidden min-[400px]:inline">My Network</span>
        {onlineCount > 0 && (
          <span
            className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-green px-1 text-[0.625rem] font-bold leading-none text-white"
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
