import { Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import NetworkNavButton from './NetworkNavButton';
import NavUserMenu from './NavUserMenu';
import Button from './ui/Button';
import useAuthStore from '../store/authStore';
import useContactsStore from '../store/contactsStore';
import { onAuthChangeForNetwork } from '../store/networkPresenceStore';
import { getUserDisplayName, getUserInitials } from '../lib/userDisplay';
import { cn } from '../lib/cn';

export default function Navbar() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const resetContacts = useContactsStore((s) => s.reset);

  const handleLogout = () => {
    clearAuth();
    resetContacts();
    onAuthChangeForNetwork();
    navigate('/');
  };

  const displayLabel = getUserDisplayName(user);
  const initials = getUserInitials(user);

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 top-0 z-50 bg-gradient-to-b from-black/92 via-black/65 to-transparent px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:px-6"
      aria-label="Main navigation"
    >
      <div className="pointer-events-auto mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <Link
          to="/"
          className="inline-flex min-w-0 shrink-0 items-center gap-2 no-underline"
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 backdrop-blur-sm"
            aria-hidden
          >
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="truncate text-base font-semibold tracking-tight text-white sm:text-lg">
            DropBridge
          </span>
        </Link>

        {user ? (
          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            <NetworkNavButton />

            <div
              className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 sm:flex"
              title={user.email}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-blue/80 to-accent-purple/80 text-xs font-bold text-white"
                aria-hidden
              >
                {initials}
              </div>
              <span className="max-w-[7rem] truncate text-sm font-medium text-white/90 md:max-w-[9rem]">
                {displayLabel}
              </span>
            </div>

            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-blue/80 to-accent-purple/80 text-xs font-bold text-white sm:hidden"
              aria-label={displayLabel}
              title={user.email}
            >
              {initials}
            </div>

            <NavUserMenu onSignOut={handleLogout} />
          </div>
        ) : (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-2.5">
            <Button
              variant="ghost"
              className={cn('nav min-h-10 px-3 py-2 text-[0.8125rem] sm:text-sm')}
              onClick={() => navigate('/')}
            >
              Continue as guest
            </Button>
            <Button
              variant="outline"
              className={cn('nav min-h-10 px-3 py-2 text-[0.8125rem] sm:text-sm')}
              onClick={() => navigate('/login')}
            >
              Login
            </Button>
            <Button
              variant="accent"
              className={cn('nav min-h-10 px-3 py-2 text-[0.8125rem] sm:text-sm')}
              onClick={() => navigate('/signup')}
            >
              <span className="min-[480px]:hidden">Sign up</span>
              <span className="hidden min-[480px]:inline">Sign up free</span>
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
