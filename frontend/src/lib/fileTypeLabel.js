const EXT_COLORS = {
  PNG: 'bg-blue-500/20 text-blue-300',
  JPG: 'bg-emerald-500/20 text-emerald-300',
  JPEG: 'bg-emerald-500/20 text-emerald-300',
  SVG: 'bg-violet-500/20 text-violet-300',
  MP4: 'bg-fuchsia-500/20 text-fuchsia-300',
  PDF: 'bg-red-500/20 text-red-300',
  DOCX: 'bg-sky-500/20 text-sky-300',
  ZIP: 'bg-amber-500/20 text-amber-300',
};

export function fileExtensionLabel(filename, mimeType) {
  const name = filename?.trim();
  if (name?.includes('.')) {
    return name.split('.').pop().toUpperCase().slice(0, 8);
  }
  const type = mimeType?.toLowerCase();
  if (type?.includes('jpeg')) return 'JPG';
  if (type?.includes('/')) {
    const sub = type.split('/')[1];
    if (sub === 'svg+xml') return 'SVG';
    return sub.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 8) || 'FILE';
  }
  return 'FILE';
}

export function extensionTagClass(ext) {
  return EXT_COLORS[ext] || 'bg-white/10 text-white/70';
}
