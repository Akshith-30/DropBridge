import { ArrowDownToLine, ArrowUpFromLine, Lock } from 'lucide-react';
import TransferStatusBadge from '../TransferStatus';
import HistoryFileChip from './HistoryFileChip';
import { formatBytes } from '../../lib/formatBytes';
import { cn } from '../../lib/cn';

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function TransferHistoryCard({
  variant,
  session,
  selected,
  onSelect,
}) {
  const isP2p = session.mode?.toUpperCase() === 'P2P';
  const isReceive = variant === 'receive';
  const Icon = isReceive ? ArrowDownToLine : ArrowUpFromLine;
  const title = session.title?.trim() ? session.title : 'Untitled transfer';
  const fileCount = session.fileCount ?? session.files?.length ?? 0;
  const totalSize = session.totalSizeBytes;

  const metaParts = [];
  if (isReceive) {
    metaParts.push(`From ${session.senderDisplayName?.trim() || 'unknown'}`);
  } else {
    metaParts.push(`Code ${session.shareCode || '—'}`);
  }
  metaParts.push(formatWhen(session.createdAt));
  metaParts.push(session.mode === 'P2P' ? 'P2P' : 'Cloud');
  if (!isP2p && fileCount > 0) {
    metaParts.push(`${fileCount} file${fileCount === 1 ? '' : 's'}`);
    if (totalSize != null) metaParts.push(formatBytes(totalSize));
  }

  const p2pNote = isReceive
    ? 'P2P — files received directly to your device, not stored on server'
    : 'P2P — sent directly, not stored on server';

  return (
    <button
      type="button"
      onClick={() => onSelect(session)}
      className={cn(
        'flex w-full flex-col gap-3 rounded-2xl border px-4 py-4 text-left transition-colors',
        selected
          ? 'border-accent-green/40 bg-accent-green/[0.06]'
          : 'border-white/10 bg-white/[0.04] hover:border-white/18 hover:bg-white/[0.07]'
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-green/15 text-accent-green">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="m-0 text-base font-semibold text-white">{title}</h2>
            <TransferStatusBadge status={session.status} />
          </div>
          <p className="mt-1 text-sm text-white/50">{metaParts.join(' · ')}</p>
        </div>
      </div>

      {isP2p ? (
        <p className="flex items-center gap-2 pl-[3.25rem] text-sm text-white/45">
          <Lock className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
          {p2pNote}
        </p>
      ) : (
        session.files?.length > 0 && (
          <div className="flex flex-wrap gap-2 pl-[3.25rem]">
            {session.files.map((f, i) => (
              <HistoryFileChip
                key={`${f.filename}-${f.size}-${i}`}
                filename={f.filename}
                size={f.size}
                mimeType={f.mimeType}
              />
            ))}
          </div>
        )
      )}
    </button>
  );
}
