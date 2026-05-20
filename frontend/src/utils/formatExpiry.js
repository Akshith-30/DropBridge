/** Human-readable link expiration for share/receive pages */
export function formatLinkExpiry(expiresAt) {
  if (!expiresAt) return null;
  const expiry = new Date(expiresAt);
  const diff = expiry - new Date();
  if (diff <= 0) return 'Link expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `Link expires in ${hours}h ${minutes}m`;
  if (minutes > 0) return `Link expires in ${minutes}m`;
  return 'Link expires soon';
}
