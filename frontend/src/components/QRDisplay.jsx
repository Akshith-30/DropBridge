import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import Button from './ui/Button';
import { sectionLabel } from '../lib/layoutStyles';

/** @param {{ qrCode?: string, shareLink?: string, showCopyLink?: boolean }} props */
export default function QRDisplay({ qrCode, shareLink, showCopyLink = import.meta.env.DEV }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-5">
      {qrCode && (
        <div className="inline-block rounded-2xl bg-white p-5 shadow-2xl">
          <img
            src={qrCode}
            alt="Scan to open receive page"
            className="block h-[200px] w-[200px] max-[480px]:h-[168px] max-[480px]:w-[168px]"
          />
        </div>
      )}

      {shareLink && showCopyLink && (
        <div className="flex w-full flex-col items-center gap-3">
          <p className={`${sectionLabel} mb-0 text-center`}>Or copy share link</p>
          <Button
            onClick={copyToClipboard}
            className="w-full min-w-40 justify-center py-3 text-sm sm:w-auto"
            id="copy-link-btn"
            aria-label={copied ? 'Link copied to clipboard' : 'Copy share link to clipboard'}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" aria-hidden />
                Link copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden />
                Copy link
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
