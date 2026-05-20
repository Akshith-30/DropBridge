import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Copy,
  Check,
  UserPlus,
  Trash2,
  Wifi,
  WifiOff,
  Send,
  Loader2,
  FileText,
  Users,
} from 'lucide-react';
import { resolvePairingCode, createSession } from '../services/api';
import {
  MAX_SESSION_SIZE_BYTES,
  MAX_SESSION_SIZE_LABEL,
  formatFileSize,
  totalBytes,
} from '../lib/uploadLimits';
import {
  listKnownContacts,
  upsertKnownContact,
  removeKnownContact,
} from '../utils/knownContacts';
import {
  getDeviceId,
  getDisplayName,
  setDisplayName,
  getPairingCode,
} from '../utils/deviceIdentity';
import { reconnectPresence } from '../webrtc/presenceClient';
import useTransferStore from '../store/transferStore';
import Button from './ui/Button';
import { formLabel, formInput, formHint } from '../lib/formStyles';
import { cn } from '../lib/cn';

export default function NetworkPanel({ onClose, onContactsChange, onlineMap, onlineCount }) {
  const navigate = useNavigate();
  const { selectedFiles, setSession, setTransferStatus } = useTransferStore();
  const [contacts, setContacts] = useState(() => listKnownContacts());
  const [deviceName, setDeviceName] = useState(getDisplayName());
  const [codeCopied, setCodeCopied] = useState(false);
  const [addName, setAddName] = useState('');
  const [addCode, setAddCode] = useState('');
  const [addError, setAddError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [panelError, setPanelError] = useState(null);
  const [sendingTo, setSendingTo] = useState(null);

  const myCode = getPairingCode();

  const refreshContacts = () => {
    const next = listKnownContacts();
    setContacts(next);
    onContactsChange?.();
    return next;
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const copyMyCode = async () => {
    try {
      await navigator.clipboard.writeText(myCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      const input = document.createElement('textarea');
      input.value = myCode;
      input.setAttribute('readonly', '');
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const saveDeviceName = () => {
    const trimmed = deviceName.trim();
    setDisplayName(trimmed);
    if (trimmed !== deviceName) {
      setDeviceName(trimmed);
    }
    reconnectPresence();
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    const code = addCode.replace(/\s/g, '').toUpperCase().slice(0, 8);
    if (!addName.trim() || code.length !== 8) {
      setAddError('Enter a name and their 8-character device code.');
      return;
    }

    try {
      setAdding(true);
      setAddError(null);
      const res = await resolvePairingCode(code);
      upsertKnownContact({
        deviceId: res.data.deviceId,
        name: addName.trim(),
        pairingCode: res.data.pairingCode || code,
      });
      refreshContacts();
      onContactsChange?.();
      setAddName('');
      setAddCode('');
      setPanelError(null);
    } catch (err) {
      console.error('Add contact failed:', err);
      setAddError(
        err.response?.status === 404
          ? 'Device not found. They must have DropBridge open, then try their code again.'
          : 'Could not add device. Check the code and try again.'
      );
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = (id) => {
    removeKnownContact(id);
    refreshContacts();
    onContactsChange?.();
    if (sendingTo === id) {
      setSendingTo(null);
    }
    setPanelError(null);
  };

  const handleSendToContact = async (contact) => {
    if (selectedFiles.length === 0) {
      setPanelError('Select at least one file on the home page first, then send from here.');
      return;
    }

    if (totalBytes(selectedFiles) > MAX_SESSION_SIZE_BYTES) {
      setPanelError(
        `Total transfer size cannot exceed ${MAX_SESSION_SIZE_LABEL} (currently ${formatFileSize(totalBytes(selectedFiles))}).`
      );
      return;
    }

    try {
      setSendingTo(contact.id);
      setPanelError(null);
      setTransferStatus('pending');

      const sessionRes = await createSession({
        mode: 'P2P',
        senderDeviceId: getDeviceId(),
        senderDisplayName: getDisplayName() || 'DropBridge user',
        targetDeviceId: contact.deviceId,
      });

      setSession(sessionRes.data);
      onClose();
      navigate(`/status/${sessionRes.data.sessionId}`, {
        state: {
          targetContactName: contact.name,
          targetNotified: sessionRes.data.targetNotified,
        },
      });
    } catch (err) {
      console.error('Failed to send to contact:', err);
      setPanelError(
        err.response?.data?.message || 'Could not start transfer. Try again.'
      );
    } finally {
      setSendingTo(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex animate-overlay-in justify-end bg-black/55 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="flex h-full w-full max-w-[22rem] animate-panel-in flex-col border-l border-white/10 bg-[rgba(12,12,18,0.98)] shadow-[-12px_0_48px_rgba(0,0,0,0.45)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="network-panel-title"
        aria-modal="true"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/8 px-5 pb-4 pt-5">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-7 w-7 shrink-0 text-accent-blue" aria-hidden />
            <div>
            <h2 id="network-panel-title" className="m-0 text-xl font-bold text-white">My network</h2>
            <p className="mt-1 text-[0.8125rem] text-white/50">
              {contacts.length === 0
                ? 'Add devices to send files instantly'
                : `${onlineCount} of ${contacts.length} online`}
            </p>
            </div>
          </div>
          <button
            type="button"
            className="flex items-center justify-center rounded-lg border-0 bg-white/6 p-1.5 text-white/70 transition-colors hover:bg-white/12 hover:text-white"
            onClick={onClose}
            aria-label="Close network panel"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pb-6 pt-4">
          <section className="flex flex-col gap-2.5">
            <h3 className="m-0 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/45">
              Your device
            </h3>
            <label className={formLabel} htmlFor="network-device-name">
              Display name
            </label>
            <input
              id="network-device-name"
              type="text"
              className={formInput}
              placeholder="e.g. Alex's laptop"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              onBlur={saveDeviceName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  saveDeviceName();
                  e.currentTarget.blur();
                }
              }}
              maxLength={80}
            />
            <div>
              <span className={formLabel}>Your pairing code</span>
              <div className="flex items-center justify-between gap-2 rounded-[0.625rem] border border-white/10 bg-white/5 px-3 py-2.5">
                <code className="font-mono text-lg font-bold tracking-[0.2em] text-white">{myCode}</code>
                <Button variant="icon" onClick={copyMyCode} aria-label={codeCopied ? 'Copied' : 'Copy pairing code'}>
                  {codeCopied ? (
                    <Check className="h-5 w-5 text-accent-green" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </Button>
              </div>
              <p className={formHint}>Others enter this code to add you. Keep DropBridge open to get alerts.</p>
            </div>
          </section>

          <section className="flex flex-col gap-2.5">
            <h3 className="m-0 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/45">
              <UserPlus className="h-4 w-4" aria-hidden />
              Add a device
            </h3>
            <form onSubmit={handleAddContact} className="flex flex-col gap-2.5">
              <input
                type="text"
                className={formInput}
                placeholder="Their name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                maxLength={80}
              />
              <input
                type="text"
                className={cn(formInput, 'font-mono uppercase tracking-widest')}
                placeholder="Their 8-char code"
                value={addCode}
                onChange={(e) =>
                  setAddCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8))
                }
                maxLength={8}
              />
              {addError && (
                <p className="text-red-400 text-sm" role="alert">
                  {addError}
                </p>
              )}
              <Button type="submit" variant="outline" className="w-full justify-center" disabled={adding}>
                {adding ? 'Adding…' : 'Add to network'}
              </Button>
            </form>
          </section>

          <section className="flex flex-1 flex-col gap-2.5">
            <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-white/45">Known devices</h3>

            {selectedFiles.length > 0 ? (
              <div className="mb-3 flex items-center gap-2 rounded-[0.625rem] border border-accent-green/25 bg-accent-green/8 px-3 py-2.5 text-sm text-white/85">
                <FileText className="h-4 w-4 shrink-0 text-accent-green" aria-hidden />
                <span className="truncate">
                  {selectedFiles.length === 1
                    ? selectedFiles[0].name
                    : `${selectedFiles.length} files ready`}
                </span>
                <span className="shrink-0 text-xs text-white/40">ready to send</span>
              </div>
            ) : (
              <p className={cn(formHint, 'mb-3')}>
                Select files on the home page, then tap Send next to a contact.
              </p>
            )}

            {panelError && (
              <p className="text-red-400 text-sm mb-3" role="alert">
                {panelError}
              </p>
            )}

            {contacts.length === 0 ? (
              <p className={formHint}>No devices yet. Add someone with their pairing code above.</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {contacts.map((contact) => {
                  const online = onlineMap[contact.deviceId];
                  const sending = sendingTo === contact.id;
                  return (
                    <li
                      key={contact.id}
                      className="flex flex-col gap-2.5 rounded-xl border border-white/8 bg-white/[0.04] p-3.5"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-[0.9375rem] font-semibold text-white">{contact.name}</span>
                        <span className="flex items-center gap-1.5 text-xs text-white/50">
                          {online ? (
                            <>
                              <Wifi className="h-3.5 w-3.5 text-accent-green" aria-hidden />
                              Online
                            </>
                          ) : (
                            <>
                              <WifiOff className="h-3.5 w-3.5" aria-hidden />
                              Offline
                            </>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          className="min-h-10 flex-1 py-2 text-sm"
                          disabled={selectedFiles.length === 0 || sending}
                          onClick={() => handleSendToContact(contact)}
                        >
                          {sending ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : (
                            <Send className="h-4 w-4" aria-hidden />
                          )}
                          Send
                        </Button>
                        <button
                          type="button"
                          className="flex items-center justify-center rounded-lg border-0 bg-white/5 p-2 text-white/45 transition-colors hover:bg-red-500/10 hover:text-red-400"
                          onClick={() => handleRemove(contact.id)}
                          aria-label={`Remove ${contact.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
