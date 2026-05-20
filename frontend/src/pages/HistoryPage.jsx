import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { History, Loader2, ArrowLeft } from 'lucide-react';
import { listMyTransferSessions } from '../services/api';
import useAuthStore from '../store/authStore';
import { formHint } from '../lib/formStyles';
import { cn } from '../lib/cn';

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function HistoryPage() {
  const user = useAuthStore((s) => s.user);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setError('Sign in to see transfers you started while logged in.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await listMyTransferSessions();
        if (!cancelled) {
          setRows(res.data || []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e.response?.status === 401
              ? 'Session expired. Sign in again.'
              : e.response?.data?.message || 'Could not load history.'
          );
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-2xl flex-col gap-6 px-4 pb-16 pt-24 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <History className="h-8 w-8 text-accent-blue" aria-hidden />
          <div>
            <h1 className="m-0 text-2xl font-bold text-white">Transfer history</h1>
            <p className={cn(formHint, 'mt-1')}>
              Sessions created while you were signed in (guest transfers are not listed here).
            </p>
          </div>
        </div>
        <Link
          to="/"
          className={cn(
            'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-transparent px-5 py-2.5 text-sm font-medium text-white no-underline transition-all duration-300 hover:border-white/30 hover:bg-white/6',
          )}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Home
        </Link>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-white/60">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Loading…
        </div>
      )}

      {!loading && error && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {error}
        </p>
      )}

      {!loading && !error && rows.length === 0 && (
        <p className="text-white/55">No transfers yet. Start one from the home page while signed in.</p>
      )}

      {!loading && rows.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {rows.map((s) => (
            <li key={s.sessionId}>
              <Link
                to={`/status/${s.sessionId}`}
                className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 no-underline transition-colors hover:border-white/18 hover:bg-white/[0.07]"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-white">
                    {s.title?.trim() ? s.title : 'Untitled transfer'}
                  </span>
                  <span className="text-xs uppercase tracking-wide text-white/45">
                    {s.mode} · {s.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 text-xs text-white/50">
                  <span>Code {s.shareCode}</span>
                  <span>{formatWhen(s.createdAt)}</span>
                  {s.targetDeviceId && <span className="truncate">Network send</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
