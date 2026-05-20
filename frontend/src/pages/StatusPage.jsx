import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Copy,
  Check,
  Clock,
  Loader2,
  CheckCircle2,
  Radio,
  FileText,
  Users,
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import QRDisplay from '../components/QRDisplay';
import TransferStatusBadge from '../components/TransferStatus';
import TransferProgress from '../components/TransferProgress';
import useTransferStore from '../store/transferStore';
import {
  getSession,
  getFilesBySession,
  uploadFile,
  finalizeCloudSession,
  updateSessionStatus,
  notifyRecipient,
} from '../services/api';
import {
  formatFileSize,
  MAX_SESSION_SIZE_BYTES,
  MAX_SESSION_SIZE_LABEL,
  totalBytes,
} from '../lib/uploadLimits';
import { runSenderTransfer } from '../webrtc/p2pTransfer';
import { resolveShareLink } from '../utils/shareLink';
import { formatLinkExpiry } from '../utils/formatExpiry';
import { upsertKnownContact } from '../utils/knownContacts';
import { shouldPollSenderSession } from '../lib/sessionPolling';

const P2P_STATUS_LABELS = {
  waiting: 'Waiting for the receiver to open your link…',
  connecting: 'Setting up a direct connection…',
  transferring: 'Sending your files…',
  awaiting_ack: 'Waiting for the receiver to confirm delivery…',
  completed: 'The receiver has your files.',
  failed: 'Direct transfer could not finish.',
};

export default function StatusPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const targetContactName = location.state?.targetContactName;
  const { selectedFiles, clearFiles } = useTransferStore();
  const [session, setSession] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const [p2pStatus, setP2pStatus] = useState(null);
  const [p2pProgress, setP2pProgress] = useState(0);
  const [p2pError, setP2pError] = useState(null);
  const [receiverJoined, setReceiverJoined] = useState(false);
  const [cloudStatus, setCloudStatus] = useState(null);
  const [emailNotified, setEmailNotified] = useState(false);
  const p2pStarted = useRef(false);
  const cloudStarted = useRef(false);
  const p2pStatusRef = useRef(p2pStatus);
  const cloudStatusRef = useRef(cloudStatus);
  p2pStatusRef.current = p2pStatus;
  cloudStatusRef.current = cloudStatus;

  useEffect(() => {
    let cancelled = false;
    let intervalId = null;

    const fetchData = async () => {
      try {
        const [sessionRes, filesRes] = await Promise.all([
          getSession(sessionId),
          getFilesBySession(sessionId),
        ]);
        if (cancelled) return;

        const nextSession = sessionRes.data;
        if (
          nextSession.status === 'CONNECTING' ||
          nextSession.status === 'TRANSFERRING' ||
          nextSession.status === 'COMPLETED'
        ) {
          setReceiverJoined(true);
        }
        setSession(nextSession);
        setFiles(filesRes.data);

        const keepPolling = shouldPollSenderSession({
          session: nextSession,
          isCloudMode: nextSession.mode === 'CLOUD',
          p2pStatus: p2pStatusRef.current,
        });
        if (!keepPolling && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      } catch (err) {
        console.error('Failed to load session:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    intervalId = setInterval(fetchData, 4000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [sessionId]);

  const isCloudMode = session?.mode === 'CLOUD';

  useEffect(() => {
    if (
      !session ||
      !isCloudMode ||
      selectedFiles.length === 0 ||
      cloudStarted.current ||
      files.length > 0
    ) {
      return;
    }

    if (totalBytes(selectedFiles) > MAX_SESSION_SIZE_BYTES) {
      setP2pError(
        `Total transfer size cannot exceed ${MAX_SESSION_SIZE_LABEL} (currently ${formatFileSize(totalBytes(selectedFiles))}).`
      );
      setCloudStatus('failed');
      return;
    }

    cloudStarted.current = true;
    setCloudStatus('uploading');
    setP2pError(null);

    (async () => {
      try {
        const total = selectedFiles.length;
        for (let i = 0; i < total; i++) {
          await uploadFile(sessionId, selectedFiles[i], (pct) => {
            const overall = Math.round(((i + pct / 100) / total) * 100);
            setP2pProgress(overall);
          });
        }
        await finalizeCloudSession(sessionId);
        if (session.recipientEmail) {
          await notifyRecipient(sessionId);
          setEmailNotified(true);
        }
        const [sessionRes, filesRes] = await Promise.all([
          getSession(sessionId),
          getFilesBySession(sessionId),
        ]);
        setSession(sessionRes.data);
        setFiles(filesRes.data);
        setCloudStatus('completed');
        clearFiles();
      } catch (err) {
        console.error('Cloud upload failed:', err);
        setP2pError(err.response?.data?.message || 'Cloud upload failed');
        setCloudStatus('failed');
        cloudStarted.current = false;
      }
    })();
  }, [session, isCloudMode, selectedFiles, files.length, sessionId, clearFiles]);

  useEffect(() => {
    if (loading || !session || selectedFiles.length === 0 || p2pStarted.current || files.length > 0) {
      return;
    }
    if (session.mode === 'CLOUD') return;

    if (totalBytes(selectedFiles) > MAX_SESSION_SIZE_BYTES) {
      setP2pError(
        `Total transfer size cannot exceed ${MAX_SESSION_SIZE_LABEL} (currently ${formatFileSize(totalBytes(selectedFiles))}).`
      );
      setP2pStatus('failed');
      return;
    }

    p2pStarted.current = true;
    setP2pError(null);

    runSenderTransfer({
      sessionId,
      files: selectedFiles,
      onProgress: setP2pProgress,
      onStatus: setP2pStatus,
      onPeerDeviceInfo: (msg) => {
        if (msg.deviceId && msg.displayName) {
          upsertKnownContact({
            deviceId: msg.deviceId,
            name: msg.displayName,
          });
        }
      },
    })
      .then(async () => {
        setP2pError(null);
        await updateSessionStatus(sessionId, 'COMPLETED');
        const sessionRes = await getSession(sessionId);
        setSession(sessionRes.data);
        clearFiles();
      })
      .catch((err) => {
        console.error('P2P transfer failed:', err);
        setP2pError(err.message || 'P2P transfer failed');
        setP2pStatus('failed');
        p2pStarted.current = false;
      });
  }, [loading, session, sessionId, selectedFiles, files.length, clearFiles]);

  const copyCode = () => {
    if (session?.shareCode) {
      navigator.clipboard.writeText(session.shareCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <main className="flex min-h-[calc(100vh-4.5rem)] flex-1 flex-col items-center justify-center px-4 pb-10 pt-[5.5rem]">
        <div className="flex items-center gap-3 text-white/60 text-lg">
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
          Loading session…
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-[calc(100vh-4.5rem)] flex-1 flex-col items-center justify-center px-4 pb-10 pt-[5.5rem]">
        <GlassCard className="p-8 text-center max-w-md">
          <p className="text-white/70 text-lg mb-6">Session not found</p>
          <button type="button" onClick={() => navigate('/')} className="inline-flex items-center justify-center gap-2 rounded-xl border-0 bg-gradient-to-br from-accent-blue to-accent-purple px-7 py-3 text-[0.95rem] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(59,130,246,0.3)]">
            Go home
          </button>
        </GlassCard>
      </main>
    );
  }

  const cloudHasFile =
    isCloudMode &&
    (files.length > 0 ||
      cloudStatus === 'completed' ||
      session.status === 'READY' ||
      session.status === 'TRANSFERRING' ||
      session.status === 'COMPLETED');
  const cloudDownloaded = isCloudMode && session.status === 'COMPLETED';
  const cloudReceiverActive =
    isCloudMode && session.status === 'TRANSFERRING' && !cloudDownloaded;
  const cloudReady = cloudHasFile && !cloudDownloaded && !cloudReceiverActive;
  const p2pDelivered = !isCloudMode && p2pStatus === 'completed';
  const isFailed =
    (!isCloudMode && p2pStatus === 'failed') || cloudStatus === 'failed';
  const isActiveP2p =
    !isCloudMode &&
    selectedFiles.length > 0 &&
    files.length === 0 &&
    p2pStatus &&
    !p2pDelivered &&
    !isFailed;
  const isActiveCloud = isCloudMode && cloudStatus === 'uploading';
  const p2pAwaitingConfirm = !isCloudMode && p2pStatus === 'awaiting_ack';
  const showProgress =
    isActiveP2p && (p2pStatus === 'transferring' || (p2pProgress > 0 && !p2pAwaitingConfirm));
  const expiryLabel = formatLinkExpiry(session.expiresAt);
  const isDirectToKnown = !isCloudMode && !!session.targetDeviceId;
  const targetNotified = session.targetNotified === true;
  const showShareDetails = isCloudMode || !isDirectToKnown || !targetNotified;

  const pageTitle = p2pDelivered || cloudDownloaded
    ? 'Transfer complete'
    : cloudReceiverActive
      ? 'Receiver downloading'
      : cloudReady
        ? 'Ready to share'
        : isFailed
          ? 'Transfer interrupted'
          : 'Share your files';

  const pageSubtitle = p2pDelivered
    ? 'Your recipient received your files successfully.'
    : cloudDownloaded
      ? 'Your recipient downloaded the file from cloud storage.'
      : cloudReceiverActive
        ? 'Someone is downloading your file now.'
        : cloudReady
          ? 'Share the code or QR below. The link stays active until it expires.'
          : isFailed
            ? 'Start a new transfer from home to try again.'
            : isCloudMode
              ? 'Uploading to secure cloud storage…'
              : isDirectToKnown && targetNotified
                ? `Waiting for ${targetContactName || 'your contact'} to accept on their device. Keep this tab open.`
                : isDirectToKnown
                  ? 'They are offline — share the code or QR below as a fallback.'
                  : 'Share the code or QR below — keep this tab open until they connect.';

  const badgeStatus = p2pDelivered || cloudDownloaded
    ? 'COMPLETED'
    : cloudReceiverActive
      ? 'TRANSFERRING'
      : cloudReady
        ? 'READY'
        : session.status;

  return (
    <main className="flex min-h-[calc(100vh-4.5rem)] flex-1 flex-col items-center justify-center px-4 pb-10 pt-[5.5rem]">
      <div className="flex w-full max-w-[40rem] flex-col gap-5">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-white/55 hover:text-white transition-colors text-sm self-start -mt-2"
          id="back-btn"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          New transfer
        </button>

        <header className="flex flex-col items-center gap-3 text-center">
          <h1>{pageTitle}</h1>
          <p className="max-w-md text-base leading-relaxed text-white/65">{pageSubtitle}</p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <TransferStatusBadge status={badgeStatus} />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-blue/20 bg-accent-blue/12 px-3 py-1.5 text-[0.8125rem] font-medium text-blue-300">
              <Radio className="w-3.5 h-3.5" aria-hidden />
              {isCloudMode ? 'Cloud storage' : 'Direct (P2P)'}
            </span>
            {isCloudMode && expiryLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/6 px-3 py-1.5 text-[0.8125rem] font-medium text-white/70">
                <Clock className="w-3.5 h-3.5" aria-hidden />
                {expiryLabel}
              </span>
            )}
          </div>
        </header>

        {receiverJoined && !p2pDelivered && !cloudDownloaded && !isFailed && (
          <div className="flex items-start gap-3.5 rounded-2xl border border-accent-blue/20 bg-accent-blue/8 p-4 px-5" role="status">
            <Users className="w-6 h-6 text-accent-blue shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="mb-1 text-[0.9375rem] font-semibold text-white">
                {isCloudMode ? 'Receiver accessed your link' : 'Receiver connected'}
              </p>
              <p className="text-sm leading-snug text-white/65">
                {isCloudMode
                  ? 'Someone opened your share code or link and can download the file.'
                  : 'Someone entered your share code. The direct transfer is starting — watch the progress below.'}
              </p>
            </div>
          </div>
        )}

        {cloudDownloaded && (
          <div className="flex items-start gap-3.5 rounded-2xl border border-accent-green/25 bg-accent-green/10 p-4 px-5" role="status">
            <CheckCircle2 className="w-6 h-6 text-accent-green shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="mb-1 text-[0.9375rem] font-semibold text-white">Download complete</p>
              <p className="text-sm leading-snug text-white/65">
                Your recipient downloaded the file. The share link stays active until it expires.
              </p>
            </div>
          </div>
        )}

        {p2pDelivered && (
          <div className="flex items-start gap-3.5 rounded-2xl border border-accent-green/25 bg-accent-green/10 p-4 px-5" role="status">
            <CheckCircle2 className="w-6 h-6 text-accent-green shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="mb-1 text-[0.9375rem] font-semibold text-white">Delivery confirmed</p>
              <p className="text-sm leading-snug text-white/65">
                The receiver got your files over a direct connection.
              </p>
            </div>
          </div>
        )}

        {cloudReady && !p2pDelivered && !cloudDownloaded && (
          <div className="flex items-start gap-3.5 rounded-2xl border border-accent-blue/20 bg-accent-blue/8 p-4 px-5" role="status">
            <CheckCircle2 className="w-6 h-6 text-accent-green shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="mb-1 text-[0.9375rem] font-semibold text-white">Files stored on cloud</p>
              <p className="text-sm leading-snug text-white/65">
                Share your code or QR with the recipient. They can download all files anytime before the
                link expires.
              </p>
            </div>
          </div>
        )}

        {isActiveCloud && (
          <GlassCard className="w-full p-6 sm:p-7">
            <div className="flex flex-col gap-3.5">
              <p className="mb-3 pl-0.5 text-[0.8125rem] font-semibold uppercase tracking-wider text-white/55">Cloud upload</p>
              <TransferProgress value={p2pProgress} label="Uploading" />
            </div>
          </GlassCard>
        )}

        {emailNotified && cloudReady && isCloudMode && (
          <div className="flex items-start gap-3.5 rounded-2xl border border-accent-blue/20 bg-accent-blue/8 p-4 px-5" role="status">
            <div>
              <p className="mb-1 text-[0.9375rem] font-semibold text-white">Email queued</p>
              <p className="text-sm leading-snug text-white/65">
                Download link will be sent to {session.recipientEmail} (logged on server in dev).
              </p>
            </div>
          </div>
        )}

        {isActiveP2p && (
          <GlassCard className="w-full p-6 sm:p-7">
            {selectedFiles.length > 0 && (
              <div className="mb-4 flex flex-col gap-2">
                <p className="pl-0.5 text-[0.8125rem] font-semibold uppercase tracking-wider text-white/55">
                  Sending {selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'}
                </p>
                <ul className="max-h-36 space-y-2 overflow-y-auto">
                  {selectedFiles.map((f, i) => (
                    <li
                      key={`${f.name}-${i}`}
                      className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.04] px-3 py-2"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-white/50" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{f.name}</p>
                        <p className="text-xs text-white/45">{formatFileSize(f.size)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                {(p2pStatus === 'waiting' || p2pStatus === 'connecting') && (
                  <div className="w-full shrink-0 sm:w-auto">
                    <Loader2
                      className="w-5 h-5 text-white/40 animate-spin"
                      aria-label="Connecting"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 border-t border-white/6 pt-5">
              <p className="mb-3 pl-0.5 text-[0.8125rem] font-semibold uppercase tracking-wider text-white/55">Direct transfer</p>
              <p className="m-0 break-words px-0.5 pb-1 text-[0.9375rem] leading-relaxed text-white/75" role="status">
                {P2P_STATUS_LABELS[p2pStatus] || 'Preparing connection…'}
              </p>

              {showProgress && (
                <div className="mt-4">
                  <TransferProgress value={p2pProgress} label="Sending" />
                </div>
              )}

              {p2pAwaitingConfirm && (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-accent-blue" aria-hidden />
                  <p className="text-sm text-white/70">
                    Files sent — waiting for the receiver to confirm they got everything.
                  </p>
                </div>
              )}
            </div>
          </GlassCard>
        )}

        {isFailed && p2pError && (
          <div className="flex items-start gap-3.5 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 px-5" role="alert">
            <div>
              <p className="mb-1 text-[0.9375rem] font-semibold text-white">Could not send via P2P</p>
              <p className="text-sm leading-snug text-white/65">{p2pError}</p>
            </div>
          </div>
        )}

        {isDirectToKnown && targetNotified && !p2pDelivered && (
          <div className="flex w-full items-start gap-3.5 rounded-2xl border border-accent-blue/20 bg-accent-blue/8 p-4 px-5" role="status">
            <div>
              <p className="mb-1 text-[0.9375rem] font-semibold text-white">Sent to {targetContactName || 'your contact'}</p>
              <p className="text-sm leading-snug text-white/65">
                They should see a popup on their DropBridge tab. The transfer starts when they tap
                Accept.
              </p>
            </div>
          </div>
        )}

        {isDirectToKnown && !targetNotified && !p2pDelivered && (
          <div className="flex w-full items-start gap-3.5 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 px-5" role="status">
            <div>
              <p className="mb-1 text-[0.9375rem] font-semibold text-white">{targetContactName || 'Contact'} is offline</p>
              <p className="text-sm leading-snug text-white/65">
                They need DropBridge open on any page to get a direct notification. Use the share
                code below instead.
              </p>
            </div>
          </div>
        )}

        {showShareDetails && (
        <GlassCard className="w-full p-6 sm:p-7">
          <section className="flex flex-col gap-3.5">
            <p className="mb-3 text-center text-[0.8125rem] font-semibold uppercase tracking-wider text-white/55">Share code</p>
            <div className="flex items-center justify-center gap-3 py-2">
              <span className="font-mono text-[clamp(1.75rem,5vw,2.25rem)] font-bold tracking-[0.35em] text-white" aria-label={`Share code ${session.shareCode}`}>
                {session.shareCode?.split('').join(' ')}
              </span>
              <button
                type="button"
                onClick={copyCode}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/6 p-2.5 text-white/70 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
                aria-label={codeCopied ? 'Code copied' : 'Copy share code'}
                id="copy-code-btn"
              >
                {codeCopied ? (
                  <Check className="w-5 h-5 text-accent-green" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
          </section>

          <section className="mt-6 border-t border-white/6 pt-6 px-0.5">
            <p className="mb-3 text-center text-[0.8125rem] font-semibold uppercase tracking-wider text-white/55">Scan QR code</p>
            <QRDisplay qrCode={session.qrCode} shareLink={resolveShareLink(session)} />
          </section>

          {files.length > 0 && (
            <section className="mt-6 border-t border-white/6 pt-6 px-0.5">
              <p className="mb-3 pl-0.5 text-[0.8125rem] font-semibold uppercase tracking-wider text-white/55">Stored file</p>
              <ul className="space-y-3">
                {files.map((file) => (
                  <li
                    key={file.id}
                    className="flex w-full flex-col items-stretch gap-3.5 rounded-2xl border border-white/8 bg-white/[0.04] p-5 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/6">
                        <FileText className="w-5 h-5 text-white/60" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <p className="break-words text-[0.9375rem] font-semibold leading-snug text-white">{file.filename}</p>
                        <p className="mt-1 break-words text-[0.8125rem] leading-snug text-white/55">
                          {formatSize(file.size)} · {file.mimeType}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </GlassCard>
        )}
      </div>
    </main>
  );
}
