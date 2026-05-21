import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Copy,
  Check,
  UserPlus,
  Wifi,
  WifiOff,
  ArrowUpFromLine,
  Loader2,
  Users,
  LogIn,
} from 'lucide-react';
import { createSession } from '../services/api';
import { resolveSessionTitle } from '../lib/sessionTitle';
import {
  MAX_SESSION_SIZE_BYTES,
  MAX_SESSION_SIZE_LABEL,
  formatFileSize,
  totalBytes,
} from '../lib/uploadLimits';
import { contactInitials, contactOnlineLabel, isContactOnline } from '../lib/contactDisplay';
import {
  getDeviceId,
  getDisplayName,
  getPairingCode,
} from '../utils/deviceIdentity';
import useTransferStore from '../store/transferStore';
import useContactsStore from '../store/contactsStore';
import useAuthStore from '../store/authStore';
import Button from './ui/Button';
import DropZone from './DropZone';
import PageBackButton from './PageBackButton';
import NetworkPanelShell from './network/NetworkPanelShell';
import NetworkActionCard from './network/NetworkActionCard';
import { formLabel, formInput, formHint } from '../lib/formStyles';
import { cn } from '../lib/cn';

/** list → add | contact → pick_device → send */
const VIEWS = {
  LIST: 'list',
  ADD: 'add',
  CONTACT: 'contact',
  PICK_DEVICE: 'pick_device',
  SEND: 'send',
};

export default function NetworkPanel({ onClose, onContactsChange, onlineMap, onlineCount }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const contacts = useContactsStore((s) => s.contacts);
  const contactsLoading = useContactsStore((s) => s.loading);
  const loadContacts = useContactsStore((s) => s.loadContacts);
  const addContactByPairing = useContactsStore((s) => s.addContactByPairing);
  const removeContactById = useContactsStore((s) => s.removeContactById);
  const { setSession, setTransferStatus, setFiles: setTransferFiles } = useTransferStore();

  const [view, setView] = useState(VIEWS.LIST);
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [addName, setAddName] = useState('');
  const [addCode, setAddCode] = useState('');
  const [addError, setAddError] = useState(null);
  const [adding, setAdding] = useState(false);

  const [sendFiles, setSendFiles] = useState([]);
  const [sendError, setSendError] = useState(null);
  const [sending, setSending] = useState(false);

  const [panelError, setPanelError] = useState(null);
  const [removing, setRemoving] = useState(false);

  const myCode = getPairingCode();
  const myName = getDisplayName() || user?.displayName || 'DropBridge user';

  useEffect(() => {
    if (user && !useContactsStore.getState().loaded) {
      loadContacts();
    }
  }, [user, loadContacts]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const subtitle =
    contactsLoading && contacts.length === 0
      ? 'Loading…'
      : contacts.length === 0
        ? 'Add devices to send files instantly'
        : `${onlineCount} of ${contacts.length} ${contacts.length === 1 ? 'person' : 'people'} online`;

  const copyText = async (text, setCopied) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('textarea');
      input.value = text;
      input.setAttribute('readonly', '');
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyMyCode = () => copyText(myCode, setCodeCopied);

  const openContact = (contact) => {
    setSelectedContact(contact);
    setSelectedDevice(null);
    setView(VIEWS.CONTACT);
    setPanelError(null);
  };

  const goList = () => {
    setView(VIEWS.LIST);
    setSelectedContact(null);
    setSelectedDevice(null);
    setSendFiles([]);
    setSendError(null);
    setPanelError(null);
  };

  const goContact = () => {
    setView(VIEWS.CONTACT);
    setSelectedDevice(null);
    setSendFiles([]);
    setSendError(null);
  };

  const startSendFlow = () => {
    if (!selectedContact) return;
    const devices = selectedContact.devices || [];
    const onlineDevices = devices.filter((d) => onlineMap[d.deviceId]);
    if (devices.length === 1) {
      setSelectedDevice(devices[0]);
      setView(VIEWS.SEND);
      return;
    }
    if (onlineDevices.length === 1) {
      setSelectedDevice(onlineDevices[0]);
      setView(VIEWS.SEND);
      return;
    }
    setSelectedDevice(null);
    setView(VIEWS.PICK_DEVICE);
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
      await addContactByPairing({
        name: addName.trim(),
        pairingCode: code,
        ownerDeviceId: getDeviceId(),
      });
      onContactsChange?.();
      setAddName('');
      setAddCode('');
      goList();
    } catch (err) {
      console.error('Add contact failed:', err);
      setAddError(
        err.response?.data?.message ||
          (err.response?.status === 404
            ? 'Person not found. They must open DropBridge while signed in, then try their code again.'
            : 'Could not add contact. Check the code and try again.')
      );
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveContact = async () => {
    if (!selectedContact) return;
    try {
      setRemoving(true);
      setPanelError(null);
      await removeContactById(selectedContact.id);
      onContactsChange?.();
      goList();
    } catch (err) {
      console.error('Remove contact failed:', err);
      setPanelError(err.response?.data?.message || 'Could not remove contact.');
    } finally {
      setRemoving(false);
    }
  };

  const handleSendToContact = async () => {
    if (!selectedContact || !selectedDevice) return;
    if (sendFiles.length === 0) {
      setSendError('Choose at least one file to send.');
      return;
    }
    if (totalBytes(sendFiles) > MAX_SESSION_SIZE_BYTES) {
      setSendError(
        `Total size cannot exceed ${MAX_SESSION_SIZE_LABEL} (currently ${formatFileSize(totalBytes(sendFiles))}).`
      );
      return;
    }

    try {
      setSending(true);
      setSendError(null);
      setTransferStatus('pending');

      const sessionRes = await createSession({
        title: resolveSessionTitle(null, sendFiles),
        mode: 'P2P',
        senderDeviceId: getDeviceId(),
        senderDisplayName: myName,
        targetDeviceId: selectedDevice.deviceId,
      });

      setTransferFiles(sendFiles);
      setSession(sessionRes.data);
      onClose();
      navigate(`/status/${sessionRes.data.sessionId}`, {
        state: {
          targetContactName: selectedContact.name,
          targetNotified: sessionRes.data.targetNotified,
        },
      });
    } catch (err) {
      console.error('Failed to send to contact:', err);
      setSendError(err.response?.data?.message || 'Could not start transfer. Try again.');
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <NetworkPanelShell subtitle="Sign in to manage your contacts" onClose={onClose}>
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 pb-8 text-center">
          <LogIn className="h-12 w-12 text-accent-blue/80" aria-hidden />
          <p className="text-sm leading-relaxed text-white/65">
            My Network is private to your account. Sign in to add contacts, see who is online, and
            send files directly to people you know.
          </p>
          <Button
            className="w-full justify-center py-3"
            onClick={() => {
              onClose();
              navigate('/login', { state: { from: 'network' } });
            }}
          >
            Sign in
          </Button>
          <p className="text-xs text-white/45">
            New here?{' '}
            <Link to="/signup" className="text-accent-blue hover:underline" onClick={onClose}>
              Create an account
            </Link>
          </p>
        </div>
      </NetworkPanelShell>
    );
  }

  const contactOnline = selectedContact ? isContactOnline(selectedContact, onlineMap) : false;

  return (
    <NetworkPanelShell subtitle={subtitle} onClose={onClose}>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-6 pt-4">
        {view === VIEWS.LIST && (
          <>
            <section className="mb-5 flex flex-col gap-2.5">
              <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-white/45">
                Your device
              </h3>
              <span className={formLabel}>Pairing code</span>
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
              <p className={formHint}>Share this so others can add you.</p>
            </section>

            <Button
              type="button"
              variant="outline"
              className="mb-5 w-full justify-center gap-2"
              onClick={() => {
                setAddError(null);
                setView(VIEWS.ADD);
              }}
            >
              <UserPlus className="h-4 w-4" aria-hidden />
              Add someone
            </Button>

            <section className="flex flex-1 flex-col gap-2.5">
              <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-white/45">
                Contacts — tap to interact
              </h3>

              {contactsLoading && contacts.length === 0 ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-white/40" aria-hidden />
                </div>
              ) : contacts.length === 0 ? (
                <p className={formHint}>No contacts yet. Add someone with their pairing code.</p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {contacts.map((contact) => {
                    const online = isContactOnline(contact, onlineMap);
                    const statusLabel = contactOnlineLabel(contact, onlineMap);
                    return (
                      <li key={contact.id}>
                        <button
                          type="button"
                          onClick={() => openContact(contact)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl border border-white/8 bg-white/[0.04] px-3.5 py-3 text-left',
                            'transition-colors hover:border-white/16 hover:bg-white/[0.07]'
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                              online
                                ? 'bg-accent-green/20 text-accent-green'
                                : 'bg-white/10 text-white/55'
                            )}
                          >
                            {contactInitials(contact.name)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[0.9375rem] font-semibold text-white">
                              {contact.name}
                            </span>
                            <span className="mt-0.5 flex items-center gap-1.5 text-xs text-white/50">
                              {online ? (
                                <>
                                  <Wifi className="h-3.5 w-3.5 text-accent-green" aria-hidden />
                                  {statusLabel}
                                </>
                              ) : (
                                <>
                                  <WifiOff className="h-3.5 w-3.5" aria-hidden />
                                  Offline
                                </>
                              )}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}

        {view === VIEWS.ADD && (
          <>
            <PageBackButton onClick={goList} label="Back" className="mb-4 px-0" />
            <h3 className="m-0 mb-4 text-lg font-semibold text-white">Add someone</h3>
            <form onSubmit={handleAddContact} className="flex flex-col gap-2.5">
              <label className={formLabel} htmlFor="network-add-name">
                Their name
              </label>
              <input
                id="network-add-name"
                type="text"
                className={formInput}
                placeholder="e.g. Ravi"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                maxLength={80}
              />
              <label className={formLabel} htmlFor="network-add-code">
                Their 8-char code
              </label>
              <input
                id="network-add-code"
                type="text"
                className={cn(formInput, 'font-mono uppercase tracking-widest')}
                placeholder="86D4F1CE"
                value={addCode}
                onChange={(e) =>
                  setAddCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8))
                }
                maxLength={8}
              />
              {addError && (
                <p className="text-sm text-red-400" role="alert">
                  {addError}
                </p>
              )}
              <Button type="submit" className="mt-2 w-full justify-center" disabled={adding}>
                {adding ? 'Adding…' : 'Add to network'}
              </Button>
            </form>
          </>
        )}

        {view === VIEWS.CONTACT && selectedContact && (
          <>
            <PageBackButton onClick={goList} label="Back" className="mb-4 px-0" />
            <div className="mb-5 flex items-center gap-3">
              <span
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold',
                  contactOnline ? 'bg-accent-green/20 text-accent-green' : 'bg-white/10 text-white/55'
                )}
              >
                {contactInitials(selectedContact.name)}
              </span>
              <div>
                <h3 className="m-0 text-lg font-semibold text-white">{selectedContact.name}</h3>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/50">
                  {contactOnline ? (
                    <>
                      <Wifi className="h-3.5 w-3.5 text-accent-green" aria-hidden />
                      {contactOnlineLabel(selectedContact, onlineMap)}
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3.5 w-3.5" aria-hidden />
                      Offline — they may not get alerts until a device is online
                    </>
                  )}
                </p>
              </div>
            </div>

            {(selectedContact.devices || []).length > 0 && (
              <section className="mb-4 flex flex-col gap-2">
                <h4 className="m-0 text-xs font-bold uppercase tracking-wider text-white/45">
                  Devices
                </h4>
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {(selectedContact.devices || []).map((device) => {
                    const on = onlineMap[device.deviceId] === true;
                    return (
                      <li
                        key={device.deviceId}
                        className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-sm"
                      >
                        <span className="truncate font-medium text-white/90">
                          {device.deviceName}
                        </span>
                        <span
                          className={cn(
                            'flex shrink-0 items-center gap-1 text-xs',
                            on ? 'text-accent-green' : 'text-white/45'
                          )}
                        >
                          {on ? (
                            <Wifi className="h-3 w-3" aria-hidden />
                          ) : (
                            <WifiOff className="h-3 w-3" aria-hidden />
                          )}
                          {on ? 'Online' : 'Offline'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <div className="flex flex-col gap-3">
              <NetworkActionCard
                icon={ArrowUpFromLine}
                title="Send files"
                subtitle={
                  (selectedContact.devices || []).length > 1
                    ? 'Choose which device should receive the files'
                    : 'Pick files and send directly to this person'
                }
                onClick={() => {
                  setSendFiles([]);
                  setSendError(null);
                  startSendFlow();
                }}
              />
            </div>

            {panelError && (
              <p className="mt-4 text-sm text-red-400" role="alert">
                {panelError}
              </p>
            )}

            <div className="mt-auto pt-8">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center border-red-500/30 text-red-300 hover:bg-red-500/10 hover:text-red-200"
                disabled={removing}
                onClick={handleRemoveContact}
              >
                {removing ? 'Removing…' : 'Remove from network'}
              </Button>
            </div>
          </>
        )}

        {view === VIEWS.PICK_DEVICE && selectedContact && (
          <>
            <PageBackButton onClick={goContact} label={`Back to ${selectedContact.name}`} className="mb-4 px-0" />
            <h3 className="m-0 mb-1 text-lg font-semibold text-white">Choose device</h3>
            <p className={cn(formHint, 'mb-4')}>
              Send to {selectedContact.name}. Pick a device that is online when possible.
            </p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {(selectedContact.devices || []).map((device) => {
                const on = onlineMap[device.deviceId] === true;
                return (
                  <li key={device.deviceId}>
                    <button
                      type="button"
                      disabled={!on}
                      onClick={() => {
                        setSelectedDevice(device);
                        setSendFiles([]);
                        setSendError(null);
                        setView(VIEWS.SEND);
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left transition-colors',
                        on
                          ? 'border-white/12 bg-white/[0.06] hover:border-white/20 hover:bg-white/[0.09]'
                          : 'cursor-not-allowed border-white/6 bg-white/[0.02] opacity-60'
                      )}
                    >
                      <span className="font-medium text-white">{device.deviceName}</span>
                      <span
                        className={cn(
                          'flex items-center gap-1 text-xs',
                          on ? 'text-accent-green' : 'text-white/45'
                        )}
                      >
                        {on ? (
                          <Wifi className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <WifiOff className="h-3.5 w-3.5" aria-hidden />
                        )}
                        {on ? 'Online' : 'Offline'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {(selectedContact.devices || []).every((d) => !onlineMap[d.deviceId]) && (
              <p className="mt-3 text-sm text-amber-200/90" role="status">
                No devices are online right now. They must open DropBridge while signed in.
              </p>
            )}
          </>
        )}

        {view === VIEWS.SEND && selectedContact && selectedDevice && (
          <>
            <PageBackButton
              onClick={() =>
                (selectedContact.devices || []).length > 1 ? setView(VIEWS.PICK_DEVICE) : goContact()
              }
              label={
                (selectedContact.devices || []).length > 1
                  ? 'Back to devices'
                  : `Back to ${selectedContact.name}`
              }
              className="mb-4 px-0"
            />
            <h3 className="m-0 mb-1 text-lg font-semibold text-white">
              Send to {selectedContact.name}
            </h3>
            <p className={cn(formHint, 'mb-4')}>
              To <span className="text-white/80">{selectedDevice.deviceName}</span> — choose files,
              then start the transfer.
            </p>

            <DropZone embedded files={sendFiles} onFilesChange={setSendFiles} />

            {sendError && (
              <p className="mt-3 text-sm text-red-400" role="alert">
                {sendError}
              </p>
            )}

            <Button
              type="button"
              className="mt-4 w-full justify-center py-3"
              disabled={sending}
              onClick={handleSendToContact}
            >
              {sending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  Starting…
                </>
              ) : sendFiles.length === 0 ? (
                'Send files'
              ) : (
                `Send ${sendFiles.length} file${sendFiles.length === 1 ? '' : 's'}`
              )}
            </Button>
          </>
        )}

      </div>
    </NetworkPanelShell>
  );
}
