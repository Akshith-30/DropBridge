import { FileText, Download } from 'lucide-react';
import Button from './ui/Button';
import {
  fileRow,
  fileRowIcon,
  fileRowName,
  fileRowMeta,
} from '../lib/layoutStyles';

export default function FileDownloadRow({ name, meta, onDownload, downloadHref, downloadId }) {
  const action = downloadHref ? (
    <a
      href={downloadHref}
      download
      className="no-underline"
      id={downloadId}
    >
      <Button className="w-full py-2.5 text-sm sm:w-auto">
        <Download className="h-4 w-4" aria-hidden />
        Download
      </Button>
    </a>
  ) : (
    <Button onClick={onDownload} className="w-full py-2.5 text-sm sm:w-auto" id={downloadId}>
      <Download className="h-4 w-4" aria-hidden />
      Download
    </Button>
  );

  return (
    <div className={fileRow}>
      <div className="flex min-w-0 flex-1 items-start gap-3.5">
        <div className={fileRowIcon} aria-hidden>
          <FileText className="h-5 w-5 text-white/60" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={fileRowName} title={name}>
            {name}
          </p>
          {meta && <p className={fileRowMeta}>{meta}</p>}
        </div>
      </div>
      <div className="w-full shrink-0 sm:w-auto">{action}</div>
    </div>
  );
}
