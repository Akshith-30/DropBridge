/** Total size cap per transfer session (must match backend). */
export const MAX_SESSION_SIZE_BYTES = 1024 * 1024 * 1024; // 1 GB

export const MAX_SESSION_SIZE_LABEL = '1GB';

/** Maximum files in one transfer session. */
export const MAX_FILES_PER_TRANSFER = 50;

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

export function totalBytes(files) {
  return files.reduce((sum, f) => sum + (f.size || 0), 0);
}

export function remainingSessionBytes(files) {
  return Math.max(0, MAX_SESSION_SIZE_BYTES - totalBytes(files));
}

export function wouldExceedSessionLimit(currentFiles, newFiles) {
  const incoming = Array.isArray(newFiles) ? newFiles : [newFiles];
  return totalBytes(currentFiles) + totalBytes(incoming) > MAX_SESSION_SIZE_BYTES;
}
