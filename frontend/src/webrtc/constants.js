/** Chunk size for P2P file transfer (matches MVP plan: 256 KB) */
export const P2P_CHUNK_SIZE = 256 * 1024;

/**
 * ICE server list for WebRTC peer connections.
 *
 * Dev: only Google STUN (works on LAN / same-network tests).
 * Production: set these Vercel env vars to enable TURN for cross-NAT P2P:
 *   VITE_TURN_URL      — e.g. turn:relay.metered.ca:80
 *   VITE_TURN_USERNAME — account username / credential username
 *   VITE_TURN_CREDENTIAL — account credential / password
 *
 * Metered.ca free tier: https://www.metered.ca/stun-turn
 * Twilio: https://www.twilio.com/stun-turn
 */
function buildIceServers() {
  const servers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    servers.push(
      {
        urls: turnUrl,
        username: turnUsername,
        credential: turnCredential,
      },
      // Also try TURNS (TLS) if URL uses plain TURN port
      {
        urls: turnUrl.replace(/^turn:/, 'turns:').replace(/:80$/, ':443'),
        username: turnUsername,
        credential: turnCredential,
      }
    );
  }

  return servers;
}

export const ICE_SERVERS = buildIceServers();

export const SIGNALING_MESSAGE_TYPES = {
  JOIN: 'JOIN',
  PEER_JOINED: 'PEER_JOINED',
  OFFER: 'OFFER',
  ANSWER: 'ANSWER',
  ICE_CANDIDATE: 'ICE_CANDIDATE',
  PEER_LEFT: 'PEER_LEFT',
  RECEIVER_ACK: 'RECEIVER_ACK',
  DEVICE_INFO: 'DEVICE_INFO',
  ERROR: 'ERROR',
};

/** Normalize enum strings from Java backend */
export function normalizeSignalingType(type) {
  return typeof type === 'string' ? type.toUpperCase() : type;
}
