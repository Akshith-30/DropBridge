import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Download } from 'lucide-react';
import TransferModeTabs from '../components/TransferModeTabs';
import TransferActionButton from '../components/TransferActionButton';
import DropZone from '../components/DropZone';
import AnimatedHeight from '../components/AnimatedHeight';
import Button from '../components/ui/Button';
import useTransferStore from '../store/transferStore';
import {
  MAX_SESSION_SIZE_BYTES,
  MAX_SESSION_SIZE_LABEL,
  formatFileSize,
  totalBytes,
} from '../lib/uploadLimits';
import { formatApiError } from '../lib/runtimeConfig';
import { createSession, joinSessionByCode } from '../services/api';
import { getDeviceId, getDisplayName } from '../utils/deviceIdentity';
import { reconnectPresence } from '../webrtc/presenceClient';
import {
  formField,
  formLabel,
  formLabelMuted,
  formInput,
  formSelect,
  formHint,
  formInputCode,
} from '../lib/formStyles';

const SHARE_CODE_LENGTH = 6;

const STORAGE_OPTIONS = [
  { value: 3, label: '3 hours' },
  { value: 24, label: '1 day' },
  { value: 72, label: '3 days' },
  { value: 168, label: '7 days' },
];

function normalizeShareCode(raw) {
  return raw.replace(/\s/g, '').toUpperCase();
}

export default function HomePage() {
  const navigate = useNavigate();
  const { selectedFiles, error, setSession, setTransferStatus, setError } = useTransferStore();
  const [pageMode, setPageMode] = useState('send');
  const [transferMethod, setTransferMethod] = useState('direct');
  const [title, setTitle] = useState('');
  const [storageHours, setStorageHours] = useState(72);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [shareCodeInput, setShareCodeInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartTransfer = async () => {
    if (selectedFiles.length === 0) return;

    if (totalBytes(selectedFiles) > MAX_SESSION_SIZE_BYTES) {
      setError(
        `Total transfer size cannot exceed ${MAX_SESSION_SIZE_LABEL} (currently ${formatFileSize(totalBytes(selectedFiles))}).`
      );
      return;
    }

    if (transferMethod === 'stored' && recipientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      setError('Enter a valid email address, or leave it blank.');
      return;
    }

    try {
      setIsSubmitting(true);
      setTransferStatus('pending');
      setError(null);

      const isDirect = transferMethod === 'direct';
      const sessionRes = await createSession({
        title: title.trim() || undefined,
        mode: transferMethod === 'stored' ? 'CLOUD' : 'P2P',
        storageHours: transferMethod === 'stored' ? storageHours : undefined,
        recipientEmail:
          transferMethod === 'stored' && recipientEmail.trim()
            ? recipientEmail.trim()
            : undefined,
        senderDeviceId: isDirect ? getDeviceId() : undefined,
        senderDisplayName: isDirect ? getDisplayName() || 'DropBridge user' : undefined,
      });
      setSession(sessionRes.data);
      navigate(`/status/${sessionRes.data.sessionId}`);
    } catch (err) {
      console.error('Failed to create session:', err);
      setError(formatApiError(err, 'Could not start transfer. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceiveByCode = async (e) => {
    e.preventDefault();
    const code = normalizeShareCode(shareCodeInput);

    if (code.length !== SHARE_CODE_LENGTH) {
      setError(`Enter the ${SHARE_CODE_LENGTH}-character code from the sender.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const sessionRes = await joinSessionByCode(code);
      navigate(`/receive/${sessionRes.data.sessionId}`);
    } catch (err) {
      console.error('Failed to join session:', err);
      setError(
        err.response?.data?.message ||
          'Invalid or expired code. Check the code and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodeChange = (value) => {
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, SHARE_CODE_LENGTH);
    setShareCodeInput(cleaned);
    if (error) setError(null);
  };

  const handlePageModeChange = (next) => {
    setPageMode(next);
    setError(null);
    if (next === 'receive') {
      reconnectPresence();
    }
  };

  const heightDeps = [pageMode, transferMethod, selectedFiles.length, error, shareCodeInput.length];

  return (
    <main className="flex min-h-[calc(100vh-4.5rem)] w-full flex-1 flex-col items-center justify-center px-4 pb-10 pt-[5.5rem]">
      <div className="mb-6 w-full max-w-[40rem] animate-fade-in-up text-center sm:mb-8">
        <AnimatedHeight deps={[pageMode]}>
          <div key={pageMode} className="animate-content-enter">
            <h1 className="mb-4 text-[clamp(2rem,6vw,3.75rem)] font-bold leading-[1.1] tracking-tight sm:mb-6">
              {pageMode === 'send' ? (
                <>
                  Share files in a snap
                  <br />
                  <span className="bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
                    without limits
                  </span>
                </>
              ) : (
                'Receive a file'
              )}
            </h1>
            <p className="mx-auto max-w-[36rem] text-[clamp(0.9375rem,2.5vw,1.125rem)] leading-relaxed text-white/55">
              {pageMode === 'send'
                ? 'Pick a file below, or use My network (top right) to send to someone you know.'
                : 'Enter the 6-character code from the sender.'}
            </p>
          </div>
        </AnimatedHeight>
      </div>

      <div className="w-full max-w-[42rem] animate-fade-in-up-delayed rounded-[1.25rem] border border-white/12 bg-[rgba(14,14,20,0.92)] p-6 shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-[box-shadow,border-color] duration-300 sm:p-7">
        <TransferModeTabs mode={pageMode} onModeChange={handlePageModeChange} />

        <AnimatedHeight deps={heightDeps}>
          <div key={pageMode} className="animate-content-enter">
            {pageMode === 'send' ? (
              <>
                <div className={formField}>
                  <label htmlFor="transfer-title" className={formLabel}>
                    Title <span className={formLabelMuted}>(optional)</span>
                  </label>
                  <input
                    id="transfer-title"
                    type="text"
                    className={formInput}
                    placeholder="e.g. Project assets"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={120}
                    autoComplete="off"
                  />
                </div>

                <DropZone embedded />

                <AnimatedHeight deps={[transferMethod]}>
                  {transferMethod === 'stored' ? (
                    <div className="pt-0.5">
                      <div className={formField}>
                        <label htmlFor="storage-duration" className={formLabel}>
                          Available for
                        </label>
                        <select
                          id="storage-duration"
                          className={formSelect}
                          value={storageHours}
                          onChange={(e) => setStorageHours(Number(e.target.value))}
                        >
                          {STORAGE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-[#121218]">
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className={formField}>
                        <label htmlFor="recipient-email" className={formLabel}>
                          Recipient email <span className={formLabelMuted}>(optional)</span>
                        </label>
                        <input
                          id="recipient-email"
                          type="email"
                          className={formInput}
                          placeholder="name@example.com"
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          autoComplete="email"
                        />
                        <p className={formHint}>
                          We&apos;ll send them the download link when the file is stored (logged in dev for
                          now).
                        </p>
                      </div>
                    </div>
                  ) : null}
                </AnimatedHeight>

                {error && (
                  <p className="mb-4 animate-content-enter text-center text-sm leading-relaxed text-red-400" role="alert">
                    {error}
                  </p>
                )}

                <TransferActionButton
                  method={transferMethod}
                  onMethodChange={setTransferMethod}
                  onSubmit={handleStartTransfer}
                  disabled={selectedFiles.length === 0}
                  loading={isSubmitting}
                />

                {selectedFiles.length === 0 && (
                  <p className={`-mt-1 text-center ${formHint}`}>Select at least one file above to continue.</p>
                )}
              </>
            ) : (
              <form onSubmit={handleReceiveByCode}>
                <div className={formField}>
                  <label htmlFor="share-code" className={formLabel}>
                    Share code
                  </label>
                  <input
                    id="share-code"
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    className={`${formInput} ${formInputCode}`}
                    placeholder="• • • • • •"
                    value={shareCodeInput}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    aria-describedby="share-code-hint"
                  />
                  <p id="share-code-hint" className={`text-center ${formHint}`}>
                    Ask the sender for their code after they start a transfer.
                  </p>
                </div>

                {error && (
                  <p className="mb-4 animate-content-enter text-center text-sm leading-relaxed text-red-400" role="alert">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={shareCodeInput.length !== SHARE_CODE_LENGTH || isSubmitting}
                  className="min-h-12 w-full justify-center text-base"
                  id="join-transfer-btn"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                      Connecting…
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5" aria-hidden />
                      Receive file
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        </AnimatedHeight>
      </div>
    </main>
  );
}
