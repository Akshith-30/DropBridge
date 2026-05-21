import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  ArrowUpFromLine,
  ArrowDownToLine,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '../lib/cn';

export default function NavUserMenu({ onSignOut }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const go = (fn) => {
    setOpen(false);
    fn();
  };

  const items = [
    {
      id: 'send-history',
      label: 'Send history',
      icon: ArrowUpFromLine,
      onClick: () => navigate('/history/send'),
    },
    {
      id: 'receive-history',
      label: 'Receive history',
      icon: ArrowDownToLine,
      onClick: () => navigate('/history/received'),
    },
    {
      id: 'settings',
      label: 'Account settings',
      icon: Settings,
      onClick: () => navigate('/settings'),
    },
    {
      id: 'sign-out',
      label: 'Sign out',
      icon: LogOut,
      onClick: onSignOut,
      danger: true,
    },
  ];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200',
          open
            ? 'border-white/20 bg-white/10 text-white'
            : 'border-white/10 bg-white/[0.04] text-white/75 hover:border-white/16 hover:bg-white/8 hover:text-white'
        )}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        id="nav-menu-btn"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          aria-labelledby="nav-menu-btn"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-[120] min-w-[13.5rem] overflow-hidden rounded-xl border border-white/12 bg-[rgba(14,14,20,0.98)] py-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        >
          {items.map(({ id, label, icon: Icon, onClick, danger }) => (
            <button
              key={id}
              type="button"
              role="menuitem"
              className={cn(
                'flex w-full items-center gap-3 px-4 py-2.5 text-left text-[0.9375rem] font-medium transition-colors',
                danger
                  ? 'text-red-300 hover:bg-red-500/10'
                  : 'text-white/85 hover:bg-white/6'
              )}
              onClick={() => go(onClick)}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
