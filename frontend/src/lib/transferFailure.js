import { getSession, updateSessionStatus } from '../services/api';

/** Mark a transfer session failed in the API so the other party can see it while polling. */
export async function reportSessionFailed(sessionId) {
  try {
    const res = await getSession(sessionId);
    if (res.data?.status === 'COMPLETED') {
      return;
    }
    await updateSessionStatus(sessionId, 'FAILED');
  } catch (err) {
    console.warn('Could not mark session as FAILED', err);
  }
}
