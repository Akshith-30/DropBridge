import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { getUserDisplayName } from '../lib/userDisplay';
import PageBackButton from '../components/PageBackButton';
import { PAGE_CONTAINER, PAGE_MAIN } from '../lib/pageLayout';
import { formHint, formLabel } from '../lib/formStyles';
import { cn } from '../lib/cn';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return (
      <main className={PAGE_MAIN}>
        <div className={PAGE_CONTAINER}>
          <PageBackButton fallback="/" />
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-white/70">Sign in to manage your account.</p>
            <Link
              to="/login"
              className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium text-white no-underline hover:bg-white/6"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={PAGE_MAIN}>
      <div className={PAGE_CONTAINER}>
        <PageBackButton fallback="/" />

        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 shrink-0 text-accent-blue" aria-hidden />
          <div>
            <h1 className="m-0 text-2xl font-bold text-white">Account settings</h1>
            <p className={cn(formHint, 'mt-1')}>Your DropBridge profile</p>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div>
            <span className={formLabel}>Display name</span>
            <p className="mt-1 text-white">{getUserDisplayName(user)}</p>
          </div>
          <div>
            <span className={formLabel}>Email</span>
            <p className="mt-1 break-all text-white/85">{user.email}</p>
          </div>
        </div>

        <p className={formHint}>
          Profile editing and preferences will be expanded in a future update.
        </p>
      </div>
    </main>
  );
}
