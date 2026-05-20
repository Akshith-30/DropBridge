import { FileText } from 'lucide-react';
import { fileRow, fileRowIcon, fileRowName, fileRowMeta } from '../lib/layoutStyles';

/** File row without a download action (use with a global Download all button). */
export default function FileListItem({ name, meta }) {
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
    </div>
  );
}
