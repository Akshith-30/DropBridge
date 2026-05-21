/** Session statuses where polling the REST API is no longer needed. */
const TERMINAL = new Set(['COMPLETED', 'FAILED', 'EXPIRED']);

export function isTerminalSessionStatus(status) {
  return TERMINAL.has(status);
}

/** Sender status page — stop hammering GET /api/transfers/{id} */
export function shouldPollSenderSession({ session, isCloudMode, p2pStatus }) {
  if (!session) return true;
  if (isTerminalSessionStatus(session.status)) return false;
  if (!isCloudMode) {
    if (p2pStatus === 'completed' || p2pStatus === 'failed') return false;
    return true;
  }
  // Cloud: keep polling until receiver finishes download (session COMPLETED)
  return !isTerminalSessionStatus(session.status);
}

/** Receiver page — poll cloud uploads; during P2P also poll so FAILED status reaches the receiver */
export function shouldPollReceiverSession({ session, isCloudMode, p2pStatus, hasFiles }) {
  if (!session) return true;
  if (isTerminalSessionStatus(session.status)) return false;
  if (!isCloudMode && (p2pStatus === 'completed' || p2pStatus === 'failed' || hasFiles)) {
    return false;
  }
  if (isCloudMode && hasFiles && session.status === 'READY') return false;
  return true;
}
