import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudUpload, FileText, X } from 'lucide-react';
import useTransferStore from '../store/transferStore';
import {
  MAX_SESSION_SIZE_BYTES,
  MAX_SESSION_SIZE_LABEL,
  MAX_FILES_PER_TRANSFER,
  formatFileSize,
  totalBytes,
} from '../lib/uploadLimits';
import { cn } from '../lib/cn';

export default function DropZone({
  embedded = false,
  /** When set, file list is controlled by parent (e.g. network send flow). */
  files: controlledFiles,
  onFilesChange,
}) {
  const transferStore = useTransferStore();
  const selectedFiles = controlledFiles ?? transferStore.selectedFiles;
  const isControlled = controlledFiles != null;

  const setFiles = (next) => {
    if (onFilesChange) onFilesChange(next);
    else transferStore.setFiles(next);
  };

  const removeFileAt = (index) => {
    setFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const setError = isControlled ? () => {} : transferStore.setError;
  const [rejectMessage, setRejectMessage] = useState(null);

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      setRejectMessage(null);
      setError(null);

      const next = [...selectedFiles];
      let skippedForSize = false;
      let skippedForCount = false;

      for (const file of acceptedFiles) {
        if (next.length >= MAX_FILES_PER_TRANSFER) {
          skippedForCount = true;
          break;
        }
        if (totalBytes(next) + file.size > MAX_SESSION_SIZE_BYTES) {
          skippedForSize = true;
          continue;
        }
        next.push(file);
      }

      if (skippedForSize) {
        setRejectMessage(
          `Total transfer size cannot exceed ${MAX_SESSION_SIZE_LABEL}. Remove files or choose smaller ones.`
        );
      } else if (skippedForCount) {
        setRejectMessage(`You can add up to ${MAX_FILES_PER_TRANSFER} files per transfer.`);
      }

      setFiles(next);
    },
    [selectedFiles, setFiles, setError]
  );

  const onDropRejected = useCallback((rejections) => {
    const first = rejections[0];
    if (!first) return;

    const code = first.errors[0]?.code;
    if (code === 'session-too-large') {
      setRejectMessage(
        `Total transfer size cannot exceed ${MAX_SESSION_SIZE_LABEL} (currently ${formatFileSize(totalBytes(selectedFiles))}).`
      );
    } else if (code === 'too-many-files') {
      setRejectMessage(`You can add up to ${MAX_FILES_PER_TRANSFER} files per transfer.`);
    } else {
      setRejectMessage(
        `Could not add file. Up to ${MAX_FILES_PER_TRANSFER} files, ${MAX_SESSION_SIZE_LABEL} total per transfer.`
      );
    }
  }, [selectedFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    multiple: true,
    maxFiles: MAX_FILES_PER_TRANSFER,
    validator: (file) => {
      if (totalBytes(selectedFiles) + file.size > MAX_SESSION_SIZE_BYTES) {
        return {
          code: 'session-too-large',
          message: `Would exceed ${MAX_SESSION_SIZE_LABEL} session limit`,
        };
      }
      return null;
    },
  });

  const hasFiles = selectedFiles.length > 0;
  const sessionTotal = totalBytes(selectedFiles);
  const nearLimit = sessionTotal > MAX_SESSION_SIZE_BYTES * 0.85;

  return (
    <div>
      <div
        {...getRootProps()}
        id="file-dropzone"
        className={cn(
          'flex min-h-44 cursor-pointer flex-col items-center justify-center gap-4 p-6 transition-all duration-300 sm:min-h-[12.5rem] sm:p-8 md:p-10',
          embedded
            ? 'mb-2 rounded-none border-0 border-b border-dashed border-white/20 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.06]'
            : 'rounded-2xl border-2 border-dashed border-white/15 hover:border-white/30 hover:bg-white/[0.02]',
          isDragActive &&
            '!border-accent-green !bg-accent-green/5 shadow-[0_0_30px_rgba(34,197,94,0.1)]'
        )}
      >
        <input {...getInputProps()} />

        {hasFiles ? (
          <div className="flex w-full max-w-md flex-col items-center gap-3">
            <p className={cn('text-center text-sm', nearLimit ? 'text-amber-300/90' : 'text-white/50')}>
              {selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'} ·{' '}
              {formatFileSize(sessionTotal)} / {MAX_SESSION_SIZE_LABEL}
            </p>
            <p className="text-xs text-white/30">Drag or click to add more (max {MAX_FILES_PER_TRANSFER} files)</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <CloudUpload
              className={cn(
                'h-12 w-12 transition-all duration-300',
                isDragActive ? 'scale-110 text-accent-green' : 'text-white/40'
              )}
            />
            <div className="text-center">
              <p className="text-base font-semibold text-white">
                {isDragActive ? 'Drop your files here' : 'Drag and drop files here'}
              </p>
              <p className="mt-1 text-sm text-white/40">
                Or click to browse · up to {MAX_SESSION_SIZE_LABEL} total · {MAX_FILES_PER_TRANSFER} files max
              </p>
            </div>
          </div>
        )}
      </div>

      {hasFiles && (
        <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
          {selectedFiles.map((f, index) => (
            <li
              key={`${f.name}-${f.size}-${index}`}
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2"
            >
              <FileText className="h-4 w-4 shrink-0 text-accent-green" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{f.name}</p>
                <p className="text-xs text-white/45">{formatFileSize(f.size)}</p>
              </div>
              <button
                type="button"
                className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFileAt(index);
                }}
                aria-label={`Remove ${f.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {rejectMessage && (
        <p className="mt-3 text-center text-sm text-red-400" role="alert">
          {rejectMessage}
        </p>
      )}
    </div>
  );
}
