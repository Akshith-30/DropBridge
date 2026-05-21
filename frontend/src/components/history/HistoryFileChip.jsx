import { formatBytes } from '../../lib/formatBytes';
import { extensionTagClass, fileExtensionLabel } from '../../lib/fileTypeLabel';
import { cn } from '../../lib/cn';

export default function HistoryFileChip({ filename, size, mimeType }) {
  const ext = fileExtensionLabel(filename, mimeType);

  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-lg border border-white/8 bg-white/[0.04] px-2.5 py-1.5 text-sm text-white/80">
      <span
        className={cn(
          'shrink-0 rounded px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide',
          extensionTagClass(ext)
        )}
      >
        {ext}
      </span>
      <span className="truncate font-medium">{filename}</span>
      <span className="shrink-0 text-white/45">· {formatBytes(size)}</span>
    </span>
  );
}
