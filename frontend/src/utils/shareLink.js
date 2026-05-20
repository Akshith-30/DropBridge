/** Build receive URL using the current dev server origin (works on 5173, 5174, etc.) */
export function getReceiveUrl(sessionId) {
  if (typeof window === 'undefined') {
    return `/receive/${sessionId}`;
  }
  return `${window.location.origin}/receive/${sessionId}`;
}

/** Prefer live browser origin over backend-configured share link */
export function resolveShareLink(session) {
  if (!session?.sessionId) return session?.shareLink ?? '';
  return getReceiveUrl(session.sessionId);
}
