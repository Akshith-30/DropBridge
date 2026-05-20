import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, CheckCircle2, Radio, Cloud, Download } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import TransferStatusBadge from '../components/TransferStatus';
import TransferProgress from '../components/TransferProgress';
import FileListItem from '../components/FileListItem';
import Button from '../components/ui/Button';
import { downloadAllCloudFiles, downloadAllP2pFiles } from '../lib/downloadFiles';
import { getSession, getFilesBySession, joinSessionById } from '../services/api';
import { runReceiverTransfer } from '../webrtc/p2pTransfer';
import { upsertKnownContact } from '../utils/knownContacts';
import { shouldPollReceiverSession } from '../lib/sessionPolling';

const P2P_STATUS_LABELS = {
  waiting: 'Connecting to the sender…',
  connecting: 'Setting up a secure peer connection…',
  transferring: 'Receiving your file…',
  completed: 'Download ready below.',
};

export default function ReceivePage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [p2pStatus, setP2pStatus] = useState(null);
  const [p2pProgress, setP2pProgress] = useState(0);
  const [p2pFiles, setP2pFiles] = useState([]);
  const [p2pError, setP2pError] = useState(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadAllDone, setDownloadAllDone] = useState(false);
  const p2pStarted = useRef(false);

  const isCloudMode = session?.mode === 'CLOUD';

  useEffect(() => {
    let cancelled = false;
    let intervalId = null;
    let p2pActive = false;

    const pollOnce = async (joinedMode) => {
      const [sessionRes, filesRes] = await Promise.all([
        getSession(sessionId),
        getFilesBySession(sessionId),
      ]);
      if (cancelled) return { session: null, files: [] };

      setSession(sessionRes.data);
      if (filesRes.data.length > 0) {
        setFiles(filesRes.data);
      }

      const keepPolling = shouldPollReceiverSession({
        session: sessionRes.data,
        isCloudMode: joinedMode === 'CLOUD',
        p2pActive,
        p2pStatus,
        hasFiles: filesRes.data.length > 0,
      });
      if (!keepPolling && intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      return { session: sessionRes.data, files: filesRes.data };
    };

    const load = async () => {
      try {
        const joinRes = await joinSessionById(sessionId);
        const joinedSession = joinRes.data;

        const { files } = await pollOnce(joinedSession.mode);

        const useP2p =
          joinedSession.mode === 'P2P' && files.length === 0 && !p2pStarted.current;

        if (useP2p) {
          p2pActive = true;
          p2pStarted.current = true;
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }

          runReceiverTransfer({
            sessionId,
            onProgress: setP2pProgress,
            onStatus: (status) => {
              setP2pStatus(status);
              if (status === 'completed' && intervalId) {
                clearInterval(intervalId);
                intervalId = null;
              }
            },
            onFileReceived: (file) => {
              setP2pFiles((prev) => {
                const dup = prev.some(
                  (f) => f.name === file.name && f.size === file.size && f.type === file.type
                );
                if (dup) return prev;
                return [...prev, file];
              });
              if (joinedSession.senderDeviceId && joinedSession.senderDisplayName) {
                upsertKnownContact({
                  deviceId: joinedSession.senderDeviceId,
                  name: joinedSession.senderDisplayName,
                });
              }
            },
            onPeerDeviceInfo: (msg) => {
              if (msg.deviceId && msg.displayName) {
                upsertKnownContact({
                  deviceId: msg.deviceId,
                  name: msg.displayName,
                });
              }
            },
          }).catch((err) => {
            console.error('P2P receive failed:', err);
            setP2pError(err.message || 'P2P receive failed');
          });
        } else if (joinedSession.mode === 'CLOUD') {
          intervalId = setInterval(() => pollOnce('CLOUD'), 5000);
        }
      } catch (err) {
        console.error('Failed to load session:', err);
        setError(err.response?.data?.message || 'Session not found or expired');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      p2pStarted.current = false;
    };
  }, [sessionId]);

  const formatSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalFileCount = p2pFiles.length + files.length;

  const handleDownloadAll = async () => {
    if (totalFileCount === 0 || downloadingAll) return;
    setDownloadingAll(true);
    setDownloadAllDone(false);
    try {
      if (hasP2pFiles) await downloadAllP2pFiles(p2pFiles);
      if (hasCloudFiles) await downloadAllCloudFiles(files);
      setDownloadAllDone(true);
    } catch (err) {
      console.error('Download all failed:', err);
    } finally {
      setDownloadingAll(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-[calc(100vh-4.5rem)] flex-1 flex-col items-center justify-center px-4 pb-10 pt-[5.5rem]">
        <div className="flex items-center gap-3 text-white/60 text-lg">
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
          Loading transfer…
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-[calc(100vh-4.5rem)] flex-1 flex-col items-center justify-center px-4 pb-10 pt-[5.5rem]">
        <GlassCard className="p-8 md:p-10 text-center max-w-md w-full">
          <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" aria-hidden />
          <h2 className="text-xl font-bold text-white mb-2">Transfer not available</h2>
          <p className="text-white/65 text-sm leading-relaxed mb-6">{error}</p>
          <button type="button" onClick={() => navigate('/')} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-0 bg-gradient-to-br from-accent-blue to-accent-purple px-7 py-3 text-[0.95rem] font-semibold text-white">
            Go to home
          </button>
        </GlassCard>
      </main>
    );
  }

  const hasCloudFiles = files.length > 0;
  const hasP2pFiles = p2pFiles.length > 0;
  const ready = hasCloudFiles || hasP2pFiles;
  const connecting = !ready && !isCloudMode;
  const displayTitle = session?.title?.trim();

  return (
    <main className="flex min-h-[calc(100vh-4.5rem)] flex-1 flex-col items-center justify-center px-4 pb-10 pt-[5.5rem]">
      <div className="flex w-full max-w-[40rem] flex-col gap-5">
        <header className="flex flex-col items-center gap-3 text-center">
          {ready ? (
            <>
              <div
                className="w-16 h-16 rounded-2xl bg-accent-green/10 border border-accent-green/25 flex items-center justify-center"
                aria-hidden
              >
                <CheckCircle2 className="w-8 h-8 text-accent-green" />
              </div>
              <h1>{displayTitle || 'Your files are ready'}</h1>
              {displayTitle && (
                <p className="text-white/45 text-sm">Your files are ready</p>
              )}
              <p className="max-w-md text-base leading-relaxed text-white/65">
                {hasP2pFiles
                  ? 'Received directly from the sender — use Download all to save every file.'
                  : 'Use Download all to save every file from secure cloud storage.'}
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-blue/20 bg-accent-blue/12 px-3 py-1.5 text-[0.8125rem] font-medium text-blue-300">
                {isCloudMode ? (
                  <Cloud className="w-3.5 h-3.5" aria-hidden />
                ) : (
                  <Radio className="w-3.5 h-3.5" aria-hidden />
                )}
                {isCloudMode ? 'Cloud storage' : 'Direct (P2P)'}
              </span>
            </>
          ) : (
            <>
              <h1>{displayTitle || (isCloudMode ? 'Preparing download' : 'Connecting to sender')}</h1>
              {displayTitle && (
                <p className="text-white/45 text-sm">
                  {isCloudMode ? 'Preparing download' : 'Connecting to sender'}
                </p>
              )}
              <p className="max-w-md text-base leading-relaxed text-white/65">
                {isCloudMode
                  ? 'The file is still being uploaded. Refresh in a moment or ask the sender to wait until upload finishes.'
                  : P2P_STATUS_LABELS[p2pStatus] ||
                    'Keep this page open. The sender must stay on their share screen.'}
              </p>
              {!isCloudMode && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {session && <TransferStatusBadge status={session.status} />}
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-blue/20 bg-accent-blue/12 px-3 py-1.5 text-[0.8125rem] font-medium text-blue-300">
                    <Radio className="w-3.5 h-3.5" aria-hidden />
                    Direct (P2P)
                  </span>
                </div>
              )}
              {!isCloudMode && (p2pStatus === 'waiting' || p2pStatus === 'connecting') && (
                <Loader2 className="w-6 h-6 text-white/45 animate-spin mt-1" aria-label="Connecting" />
              )}
            </>
          )}
        </header>

        {connecting && p2pStatus === 'transferring' && (
          <GlassCard className="p-5 md:p-6 w-full">
            <TransferProgress value={p2pProgress} label="Receiving" />
          </GlassCard>
        )}

        {connecting && p2pError && (
          <div className="flex w-full items-start gap-3.5 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 px-5" role="alert">
            <div>
              <p className="mb-1 text-[0.9375rem] font-semibold text-white">Connection issue</p>
              <p className="text-sm leading-snug text-white/65">
                {p2pError}. Ask the sender to keep their tab open and try again.
              </p>
            </div>
          </div>
        )}

        {ready && (
          <div className="flex w-full flex-col gap-3">
            <Button
              type="button"
              className="w-full py-3.5 text-base"
              onClick={handleDownloadAll}
              disabled={downloadingAll}
              id="download-all-btn"
            >
              {downloadingAll ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  Downloading…
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" aria-hidden />
                  Download all ({totalFileCount} file{totalFileCount === 1 ? '' : 's'})
                </>
              )}
            </Button>
            {downloadAllDone && (
              <p className="text-center text-sm text-accent-green" role="status">
                Downloads started — check your browser downloads folder.
              </p>
            )}
          </div>
        )}

        <GlassCard className="w-full p-6 sm:p-7">
          {hasP2pFiles && (
            <section className="flex flex-col gap-3.5">
              <p className="mb-3 pl-0.5 text-[0.8125rem] font-semibold uppercase tracking-wider text-white/55">
                Your file{p2pFiles.length > 1 ? 's' : ''} ({p2pFiles.length})
              </p>
              <ul className="space-y-3">
                {p2pFiles.map((f, i) => (
                  <li key={`${f.name}-${f.size}-${i}`}>
                    <FileListItem
                      name={f.name}
                      meta={`${formatSize(f.size)} · ${f.type || 'application/octet-stream'}`}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {hasCloudFiles && (
            <section
              className={hasP2pFiles ? 'mt-6 flex flex-col gap-3.5 border-t border-white/6 px-0.5 pt-6' : 'flex flex-col gap-3.5'}
            >
              <p className="mb-3 pl-0.5 text-[0.8125rem] font-semibold uppercase tracking-wider text-white/55">
                {hasP2pFiles ? 'Also on cloud' : 'Your files'}
                {files.length > 1 ? ` (${files.length})` : ''}
              </p>
              <ul className="space-y-3">
                {files.map((file) => (
                  <li key={file.id}>
                    <FileListItem
                      name={file.filename}
                      meta={`${formatSize(file.size)} · ${file.mimeType}`}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!ready && isCloudMode && (
            <div className="text-center py-8 px-3">
              <Loader2 className="w-6 h-6 text-white/45 animate-spin mx-auto mb-3" aria-hidden />
              <p className="text-white/70 text-base font-medium mb-2">Waiting for the file</p>
              <p className="text-white/50 text-sm leading-relaxed">
                The sender is still uploading. This page will update automatically.
              </p>
            </div>
          )}

          {connecting && !isCloudMode && !p2pError && (
            <div className="text-center py-8 px-3">
              <p className="text-white/70 text-base font-medium mb-2">Waiting for the file</p>
              <p className="text-white/50 text-sm leading-relaxed">
                Ask the sender to keep their share page open while you stay here.
              </p>
            </div>
          )}
        </GlassCard>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex min-h-11 items-center justify-center self-center rounded-xl border-0 bg-transparent px-5 py-3 text-[0.9375rem] font-medium text-white/65 transition-colors hover:bg-white/6 hover:text-white"
        >
          Send your own files
        </button>
      </div>
    </main>
  );
}
