import { Sparkles, LogOut, History } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import NetworkNavButton from './NetworkNavButton';
import Button from './ui/Button';
import useAuthStore from '../store/authStore';
import { reconnectPresence } from '../webrtc/presenceClient';
import { cn } from '../lib/cn';

export default function Navbar() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const handleLogout = () => {
    clearAuth();
    reconnectPresence();
    navigate('/');
  };

  const displayLabel = user?.displayName || user?.email?.split('@')[0];

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 top-0 z-50 bg-gradient-to-b from-black/92 via-black/65 to-transparent px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:px-6"
      aria-label="Main navigation"
    >
      <div className="pointer-events-auto mx-auto w-full max-w-3xl">
        <div className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 max-[380px]:grid-cols-1 max-[380px]:justify-items-center max-[380px]:text-center">
          <Link
            to="/"
            className="inline-flex min-w-0 items-center gap-2 no-underline max-[380px]:justify-self-center"
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

          <div className="flex shrink-0 items-center justify-end gap-2 max-[380px]:w-full max-[380px]:justify-center max-[479px]:flex-wrap sm:gap-2.5">
            <NetworkNavButton />
            {user ? (
              <>
                <span
                  className="hidden max-w-[8rem] truncate text-sm text-white/70 sm:inline"
                  title={user.email}
                >
                  {displayLabel}
                </span>
                <Button
                  variant="outline"
                  className={cn(
                    'min-h-10 gap-1.5 px-3 py-2 text-[0.8125rem] sm:text-sm',
                    'max-[380px]:max-w-[9.5rem] max-[380px]:flex-1'
                  )}
                  onClick={() => navigate('/history')}
                  aria-label="Transfer history"
                >
                  <History className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">History</span>
                </Button>
                <Button
                  variant="outline"
                  className={cn(
                    'min-h-10 gap-1.5 px-3 py-2 text-[0.8125rem] sm:text-sm',
                    'max-[380px]:max-w-[9.5rem] max-[380px]:flex-1'
                  )}
                  onClick={handleLogout}
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className={cn(
                    'min-h-10 whitespace-nowrap px-3 py-2 text-[0.8125rem] sm:min-h-[2.625rem] sm:px-[1.125rem] sm:text-sm',
                    'max-[380px]:max-w-[9.5rem] max-[380px]:flex-1'
                  )}
                  onClick={() => navigate('/login')}
                >
                  Sign In
                </Button>
                <Button
                  variant="accent"
                  className={cn(
                    'min-h-10 whitespace-nowrap px-3 py-2 text-[0.8125rem] sm:min-h-[2.625rem] sm:px-[1.125rem] sm:text-sm',
                    'max-[380px]:max-w-[9.5rem] max-[380px]:flex-1'
                  )}
                  onClick={() => navigate('/signup')}
                >
                  <span className="inline min-[520px]:hidden">Sign up</span>
                  <span className="hidden min-[520px]:inline">Create Account</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
