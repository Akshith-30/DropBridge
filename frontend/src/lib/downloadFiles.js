import { getApiBaseOrigin } from './runtimeConfig';

export function getCloudFileDownloadUrl(fileId) {
  const origin = getApiBaseOrigin();
  const path = `/api/files/${fileId}/download`;
  return origin ? `${origin}${path}` : path;
}

export function downloadBlobFile(file) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name || 'download';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadFromUrl(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || '';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Stagger saves so the browser does not block multiple downloads. */
export async function downloadAllP2pFiles(files, delayMs = 400) {
  for (let i = 0; i < files.length; i++) {
    downloadBlobFile(files[i]);
    if (i < files.length - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

export async function downloadAllCloudFiles(files, delayMs = 400) {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    downloadFromUrl(getCloudFileDownloadUrl(file.id), file.filename);
    if (i < files.length - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
