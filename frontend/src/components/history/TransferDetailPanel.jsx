import { useEffect, useState } from 'react';
import { Eye, Loader2, Lock, Save } from 'lucide-react';
import { getSessionFiles } from '../../services/api';
import { getCloudFileDownloadUrl, downloadFromUrl } from '../../lib/downloadFiles';
import { formatBytes } from '../../lib/formatBytes';
import { cn } from '../../lib/cn';
import Breadcrumb from '../Breadcrumb';
import PageBackButton from '../PageBackButton';
import Button from '../ui/Button';

const HISTORY_LABELS = {
  send: 'Send history',
  received: 'Receive history',
};

function isPreviewable(mimeType, filename) {
  const type = (mimeType || '').toLowerCase();
  if (type.startsWith('image/') || type === 'application/pdf') return true;
  const ext = filename?.split('.').pop()?.toLowerCase();
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'pdf'].includes(ext);
}

function resolveFileUrl(file) {
  return file.downloadUrl || file.previewUrl || getCloudFileDownloadUrl(file.id);
}

export default function TransferDetailPanel({ variant, session, onClose }) {
  const isP2p = session?.mode?.toUpperCase() === 'P2P';
  const isReceive = variant === 'receive';
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const title = session?.title?.trim() ? session.title : 'Untitled transfer';

  useEffect(() => {
    if (!session?.sessionId || isP2p) {
      setFiles([]);
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getSessionFiles(session.sessionId);
        if (!cancelled) setFiles(res.data || []);
      } catch (e) {
        if (!cancelled) {
          setError(e.response?.data?.message || 'Could not load files.');
          setFiles([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.sessionId, isP2p]);

  if (!session) return null;

  const p2pNote = isReceive
    ? 'P2P — files received directly to your device, not stored on server'
    : 'P2P — sent directly, not stored on server';

  const historyLabel = HISTORY_LABELS[variant] || 'History';

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
        aria-label="Close detail panel"
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed right-0 top-0 z-[100] flex h-full w-full max-w-md flex-col',
          'border-l border-white/10 bg-[rgba(12,12,18,0.98)] shadow-2xl backdrop-blur-xl'
        )}
        role="dialog"
        aria-labelledby="transfer-detail-title"
      >
        <header className="flex flex-col gap-4 border-b border-white/8 px-5 py-5">
          <PageBackButton
            onClick={onClose}
            label={`Back to ${historyLabel}`}
            className="px-0"
          />
          <Breadcrumb
            items={[
              { label: 'Home', to: '/' },
              { label: historyLabel, onClick: onClose },
              { label: title, current: true },
            ]}
          />
          <div className="min-w-0">
            <h2 id="transfer-detail-title" className="m-0 truncate text-lg font-semibold text-white">
              {title}
            </h2>
            <p className="mt-1 text-sm text-white/50">
              {session.mode} · {session.status}
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isP2p ? (
            <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/65">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-white/50" aria-hidden />
              <p>{p2pNote}</p>
            </div>
          ) : (
            <>
              {loading && (
                <div className="flex items-center gap-2 text-white/60">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  Loading files…
                </div>
              )}
              {error && (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                  {error}
                </p>
              )}
              {!loading && !error && files.length === 0 && (
                <p className="text-sm text-white/50">No cloud files stored for this transfer.</p>
              )}
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {files.map((file) => {
                  const url = resolveFileUrl(file);
                  const canPreview = isPreviewable(file.mimeType, file.filename);
                  return (
                    <li
                      key={file.id}
                      className="rounded-xl border border-white/10 bg-white/[0.04] p-4"
                    >
                      <p className="m-0 truncate font-medium text-white">{file.filename}</p>
                      <p className="mt-0.5 text-xs text-white/45">
                        {formatBytes(file.size)}
                        {file.mimeType ? ` · ${file.mimeType}` : ''}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2 px-3 py-2 text-sm"
                          disabled={!canPreview}
                          onClick={() => canPreview && window.open(url, '_blank', 'noopener,noreferrer')}
                        >
                          <Eye className="h-4 w-4" aria-hidden />
                          Preview
                        </Button>
                        <Button
                          type="button"
                          className="gap-2 px-3 py-2 text-sm"
                          onClick={() => downloadFromUrl(url, file.filename)}
                        >
                          <Save className="h-4 w-4" aria-hidden />
                          Save
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
