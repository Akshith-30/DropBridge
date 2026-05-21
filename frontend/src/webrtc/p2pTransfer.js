import { SignalingClient } from './signalingClient';
import { ICE_SERVERS, P2P_CHUNK_SIZE, SIGNALING_MESSAGE_TYPES, normalizeSignalingType } from './constants';
import { getDeviceId, getDisplayName } from '../utils/deviceIdentity';

/**
 * How long (ms) to wait for a P2P data channel to open before giving up.
 * Override via VITE_P2P_TIMEOUT_MS env var if needed.
 */
const P2P_TIMEOUT_MS = Number(import.meta.env.VITE_P2P_TIMEOUT_MS) || 20_000;

function notifyPeerError(signaling, message) {
  try {
    signaling?.send({
      type: SIGNALING_MESSAGE_TYPES.ERROR,
      message: message || 'Transfer failed',
    });
  } catch {
    // best-effort — peer may already be disconnected
  }
}

function isType(msg, expected) {
  return normalizeSignalingType(msg?.type) === expected;
}

async function setRemoteDescription(pc, sdp) {
  if (!sdp) throw new Error('Missing SDP');
  await pc.setRemoteDescription(sdp);
}

async function addIceCandidateSafe(pc, candidate, queue) {
  if (!candidate) return;
  if (!pc.remoteDescription) {
    queue.push(candidate);
    return;
  }
  try {
    await pc.addIceCandidate(candidate);
  } catch (err) {
    console.warn('ICE candidate error:', err);
  }
}

async function flushIceQueue(pc, queue) {
  while (queue.length > 0 && pc.remoteDescription) {
    const candidate = queue.shift();
    try {
      await pc.addIceCandidate(candidate);
    } catch (err) {
      console.warn('ICE flush error:', err);
    }
  }
}

/**
 * Sender: waits for receiver, negotiates WebRTC, sends file, waits for receiver ack.
 */
function sendDeviceInfo(signaling) {
  signaling.send({
    type: SIGNALING_MESSAGE_TYPES.DEVICE_INFO,
    deviceId: getDeviceId(),
    displayName: getDisplayName() || 'DropBridge user',
  });
}

export function runSenderTransfer({ sessionId, file, files, onProgress, onStatus, onPeerDeviceInfo }) {
  const fileList = files?.length ? files : file ? [file] : [];
  if (fileList.length === 0) {
    return Promise.reject(new Error('No files to send'));
  }

  let pc = null;
  let signaling = null;
  let dataChannel = null;
  let negotiating = false;
  let transferDone = false;
  let filesSendStarted = false;
  let p2pTimeoutHandle = null;
  let ackResolver = null;
  const iceQueue = [];

  const cleanupMedia = () => {
    if (p2pTimeoutHandle) {
      clearTimeout(p2pTimeoutHandle);
      p2pTimeoutHandle = null;
    }
    dataChannel?.close();
    pc?.close();
    dataChannel = null;
    pc = null;
  };

  return new Promise((resolve, reject) => {
    const fail = (err) => {
      if (transferDone) return;
      notifyPeerError(signaling, err?.message);
      cleanupMedia();
      signaling?.close();
      reject(err);
    };

    // Start the P2P timeout watchdog once we begin negotiation.
    // Cancelled immediately if dataChannel.onopen fires first.
    const startP2pTimeout = () => {
      if (p2pTimeoutHandle) return; // already running
      p2pTimeoutHandle = setTimeout(() => {
        if (transferDone) return;
        const err = new Error(
          `Direct connection timed out after ${P2P_TIMEOUT_MS / 1000}s. Ask the receiver to keep their page open and try again.`
        );
        onStatus?.('failed');
        fail(err);
      }, P2P_TIMEOUT_MS);
    };

    const sendOffer = async () => {
      if (negotiating || !pc) return;
      negotiating = true;
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        signaling.send({
          type: SIGNALING_MESSAGE_TYPES.OFFER,
          sdp: offer,
        });
      } catch (err) {
        negotiating = false;
        fail(err);
      }
    };

    const startNegotiation = async () => {
      if (pc) {
        await sendOffer();
        return;
      }

      try {
        onStatus?.('connecting');
        pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        dataChannel = pc.createDataChannel('fileTransfer', { ordered: true });

        startP2pTimeout();

        dataChannel.onopen = async () => {
          if (filesSendStarted || transferDone) return;
          filesSendStarted = true;

          if (p2pTimeoutHandle) {
            clearTimeout(p2pTimeoutHandle);
            p2pTimeoutHandle = null;
          }
          onStatus?.('transferring');
          try {
            const waitForAck = (timeoutMs = 90_000) =>
              new Promise((res, rej) => {
                const timer = setTimeout(() => {
                  ackResolver = null;
                  rej(new Error('Receiver did not confirm delivery in time'));
                }, timeoutMs);
                ackResolver = () => {
                  clearTimeout(timer);
                  ackResolver = null;
                  res();
                };
              });

            for (let i = 0; i < fileList.length; i++) {
              const current = fileList[i];
              const fileProgress = (pct) => {
                const base = (i / fileList.length) * 100;
                onProgress?.(Math.min(99, Math.round(base + pct / fileList.length)));
              };
              await sendFileOverChannel(dataChannel, current, fileProgress, i, fileList.length);
              if (i < fileList.length - 1) {
                await waitForAck();
              } else {
                onStatus?.('awaiting_ack');
                onProgress?.(99);
                await waitForAck();
              }
            }

            transferDone = true;
            onProgress?.(100);
            onStatus?.('completed');
            cleanupMedia();
            resolve();
          } catch (err) {
            fail(err);
          }
        };

        dataChannel.onerror = () => {
          if (!transferDone) fail(new Error('Data channel error'));
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            signaling.send({
              type: SIGNALING_MESSAGE_TYPES.ICE_CANDIDATE,
              candidate: event.candidate.toJSON(),
            });
          }
        };

        pc.onconnectionstatechange = () => {
          if (!transferDone && pc?.connectionState === 'failed') {
            fail(new Error('P2P connection failed'));
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (!transferDone && pc?.iceConnectionState === 'failed') {
            fail(new Error('ICE connection failed'));
          }
        };

        await sendOffer();
      } catch (err) {
        fail(err);
      }
    };

    signaling = new SignalingClient({
      sessionId,
      role: 'sender',
      onMessage: async (msg) => {
        try {
          if (isType(msg, SIGNALING_MESSAGE_TYPES.DEVICE_INFO) && msg.deviceId) {
            onPeerDeviceInfo?.(msg);
          } else if (isType(msg, SIGNALING_MESSAGE_TYPES.PEER_JOINED) && msg.role === 'receiver') {
            if (!transferDone && !filesSendStarted) {
              await startNegotiation();
            }
          } else if (isType(msg, SIGNALING_MESSAGE_TYPES.ANSWER) && pc) {
            await setRemoteDescription(pc, msg.sdp);
            negotiating = false;
            await flushIceQueue(pc, iceQueue);
          } else if (isType(msg, SIGNALING_MESSAGE_TYPES.ICE_CANDIDATE) && pc) {
            await addIceCandidateSafe(pc, msg.candidate, iceQueue);
          } else if (isType(msg, SIGNALING_MESSAGE_TYPES.RECEIVER_ACK)) {
            if (ackResolver) {
              ackResolver();
            }
          } else if (isType(msg, SIGNALING_MESSAGE_TYPES.ERROR)) {
            fail(new Error(msg.message || 'Signaling error'));
          }
        } catch (err) {
          fail(err);
        }
      },
      onError: () => fail(new Error('Signaling connection failed')),
    });

    signaling
      .connect()
      .then(() => {
        sendDeviceInfo(signaling);
        onStatus?.('waiting');
      })
      .catch(fail);
  });
}

/**
 * Receiver: joins signaling, answers offer, receives file, sends ack to sender.
 */
export function runReceiverTransfer({
  sessionId,
  onProgress,
  onStatus,
  onFileReceived,
  onPeerDeviceInfo,
}) {
  let pc = null;
  let signaling = null;
  const iceQueue = [];
  let batchComplete = false;
  let offerInFlight = false;
  let filesReceivedInBatch = 0;

  const cleanupMedia = () => {
    pc?.close();
    pc = null;
  };

  return new Promise((resolve, reject) => {
    const fail = (err) => {
      notifyPeerError(signaling, err?.message);
      cleanupMedia();
      signaling?.close();
      reject(err);
    };

    const handleOffer = async (msg) => {
      // Ignore duplicate offers (signaling replay, reconnects, ICE renegotiation)
      if (batchComplete || offerInFlight) {
        return;
      }
      if (pc && pc.connectionState !== 'closed' && pc.connectionState !== 'failed') {
        return;
      }

      offerInFlight = true;
      onStatus?.('connecting');

      if (pc) {
        pc.close();
        pc = null;
      }

      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      pc.ondatachannel = (event) => {
        const channel = event.channel;
        let receivedMetadata = null;
        const chunks = [];

        channel.onmessage = (ev) => {
          if (batchComplete) return;

          if (typeof ev.data === 'string') {
            const meta = JSON.parse(ev.data);
            if (meta.type === 'metadata') {
              receivedMetadata = meta;
              chunks.length = 0;
            } else if (meta.type === 'complete') {
              const blob = new Blob(chunks, {
                type: receivedMetadata?.mimeType || 'application/octet-stream',
              });
              const received = new File([blob], receivedMetadata?.name || 'download', {
                type: receivedMetadata?.mimeType || 'application/octet-stream',
              });
              const total = receivedMetadata?.total || 1;
              const index = receivedMetadata?.index ?? 0;

              filesReceivedInBatch += 1;
              onFileReceived?.(received);
              signaling.send({ type: SIGNALING_MESSAGE_TYPES.RECEIVER_ACK });

              if (index + 1 >= total) {
                batchComplete = true;
                onStatus?.('completed');
                cleanupMedia();
                resolve(received);
              }
            }
          } else {
            chunks.push(ev.data);
            if (receivedMetadata?.size) {
              const loaded = chunks.reduce(
                (sum, c) => sum + (c.byteLength || c.size || 0),
                0
              );
              onProgress?.(Math.min(100, Math.round((loaded / receivedMetadata.size) * 100)));
            }
          }
        };

        channel.onopen = () => onStatus?.('transferring');
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          signaling.send({
            type: SIGNALING_MESSAGE_TYPES.ICE_CANDIDATE,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (!batchComplete && pc?.connectionState === 'failed') {
          fail(new Error('P2P connection failed'));
        }
      };

      try {
        await setRemoteDescription(pc, msg.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        signaling.send({
          type: SIGNALING_MESSAGE_TYPES.ANSWER,
          sdp: answer,
        });
        await flushIceQueue(pc, iceQueue);
      } finally {
        offerInFlight = false;
      }
    };

    signaling = new SignalingClient({
      sessionId,
      role: 'receiver',
      onMessage: async (msg) => {
        try {
          if (isType(msg, SIGNALING_MESSAGE_TYPES.DEVICE_INFO) && msg.deviceId) {
            onPeerDeviceInfo?.(msg);
          } else if (isType(msg, SIGNALING_MESSAGE_TYPES.OFFER)) {
            await handleOffer(msg);
          } else if (isType(msg, SIGNALING_MESSAGE_TYPES.ICE_CANDIDATE) && pc) {
            await addIceCandidateSafe(pc, msg.candidate, iceQueue);
          } else if (isType(msg, SIGNALING_MESSAGE_TYPES.ERROR)) {
            fail(new Error(msg.message || 'Signaling error'));
          }
        } catch (err) {
          fail(err);
        }
      },
      onError: () => fail(new Error('Signaling connection failed')),
    });

    signaling
      .connect()
      .then(() => {
        sendDeviceInfo(signaling);
        onStatus?.('waiting');
      })
      .catch(fail);
  });
}

async function sendFileOverChannel(channel, file, onProgress, index = 0, total = 1) {
  if (channel.readyState !== 'open') {
    throw new Error('Data channel not open');
  }

  channel.send(
    JSON.stringify({
      type: 'metadata',
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      index,
      total,
    })
  );

  let offset = 0;
  while (offset < file.size) {
    const slice = file.slice(offset, offset + P2P_CHUNK_SIZE);
    const buffer = await slice.arrayBuffer();
    channel.send(buffer);
    offset += buffer.byteLength;
    onProgress?.(Math.min(100, Math.round((offset / file.size) * 100)));
  }

  channel.send(JSON.stringify({ type: 'complete' }));
}
