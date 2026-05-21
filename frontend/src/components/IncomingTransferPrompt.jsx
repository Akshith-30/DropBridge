import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileDown } from 'lucide-react';
import Button from './ui/Button';
import {
  onIncomingTransfer,
  normalizePresenceType,
  PRESENCE_TYPES,
} from '../webrtc/presenceClient';

export default function IncomingTransferPrompt() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathnameRef = useRef(location.pathname);
  const [incoming, setIncoming] = useState(null);

  pathnameRef.current = location.pathname;

  useEffect(() => {
    return onIncomingTransfer((message) => {
      if (normalizePresenceType(message.type) !== PRESENCE_TYPES.INCOMING_TRANSFER) {
        return;
      }
      const sessionId = message.sessionId;
      if (!sessionId) {
        console.warn('Incoming transfer missing sessionId', message);
        return;
      }

      const receivePath = `/receive/${sessionId}`;
      if (pathnameRef.current === receivePath) {
        return;
      }

      setIncoming({
        sessionId,
        senderName: message.senderName || 'Someone',
        title: message.title,
        shareCode: message.shareCode,
      });
    });
  }, []);

  if (!incoming) {
    return null;
  }

  const accept = () => {
    navigate(`/receive/${incoming.sessionId}`);
    setIncoming(null);
  };

  return (
    <div
      className="pointer-events-none fixed bottom-5 left-5 right-5 z-[100] mx-auto max-w-sm sm:left-auto sm:right-5"
      role="alertdialog"
      aria-labelledby="incoming-transfer-title"
    >
      <div className="pointer-events-auto flex flex-col gap-3.5 rounded-2xl border border-accent-blue/45 bg-[rgba(14,14,22,0.98)] p-5 shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-blue/15 text-blue-400" aria-hidden>
          <FileDown className="h-6 w-6" />
        </div>
        <div>
          <p id="incoming-transfer-title" className="m-0 text-base font-bold text-white">
            Incoming file from {incoming.senderName}
          </p>
          {incoming.title && (
            <p className="mt-1 text-sm text-white/65">{incoming.title}</p>
          )}
          <p className="mt-1.5 text-[0.8125rem] leading-snug text-white/50">
            Accept to start receiving. Keep this tab open during the transfer.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button className="w-full justify-center" onClick={accept}>
            Accept file
          </Button>
          <Button variant="ghost" className="w-full justify-center" onClick={() => setIncoming(null)}>
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
