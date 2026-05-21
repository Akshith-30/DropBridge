import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine, Loader2 } from 'lucide-react';
import {
  listReceivedTransferSessions,
  listSentTransferSessions,
} from '../services/api';
import useAuthStore from '../store/authStore';
import PageBackButton from '../components/PageBackButton';
import TransferHistoryCard from '../components/history/TransferHistoryCard';
import TransferDetailPanel from '../components/history/TransferDetailPanel';
import { PAGE_MAIN } from '../lib/pageLayout';
import { formHint } from '../lib/formStyles';
import { cn } from '../lib/cn';

const CONFIG = {
  send: {
    title: 'Send history',
    subtitle: "Files you've sent. Click any transfer to preview and download files.",
    icon: ArrowUpFromLine,
    load: listSentTransferSessions,
    signInHint: 'Sign in to see transfers you sent while logged in.',
    empty: 'No sent transfers yet. Start one from the home page while signed in.',
  },
  received: {
    title: 'Receive history',
    subtitle: 'Files others sent you. Click any transfer to preview and download files.',
    icon: ArrowDownToLine,
    load: listReceivedTransferSessions,
    signInHint: 'Sign in to see transfers you received while logged in.',
    empty: 'No received transfers yet. Join a share link while signed in to appear here.',
  },
};

export default function TransferHistoryPage() {
  const { variant } = useParams();
  const user = useAuthStore((s) => s.user);
  const cfg = CONFIG[variant];

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setSelected(null);
  }, [variant]);

  useEffect(() => {
    if (!cfg) return;
    if (!user) {
      setLoading(false);
      setError(cfg.signInHint);
      setRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await cfg.load();
        if (!cancelled) setRows(res.data || []);
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
  }, [user, cfg]);

  if (!cfg) {
    return <Navigate to="/history/send" replace />;
  }

  const Icon = cfg.icon;

  return (
    <main className={PAGE_MAIN}>
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <PageBackButton fallback="/" />

        <div className="flex items-center gap-3">
          <Icon className="h-8 w-8 shrink-0 text-accent-green" aria-hidden />
          <div>
            <h1 className="m-0 text-2xl font-bold text-white">{cfg.title}</h1>
            <p className={cn(formHint, 'mt-1')}>{cfg.subtitle}</p>
          </div>
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
          <p className="text-white/55">{cfg.empty}</p>
        )}

        {!loading && rows.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {rows.map((s) => (
              <li key={s.sessionId}>
                <TransferHistoryCard
                  variant={variant}
                  session={s}
                  selected={selected?.sessionId === s.sessionId}
                  onSelect={setSelected}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <TransferDetailPanel
          variant={variant}
          session={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}
