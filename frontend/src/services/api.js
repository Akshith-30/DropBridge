import axios from 'axios';
import { getAccessToken } from '../store/authStore';
import { getApiBaseUrl } from '../lib/runtimeConfig';

const api = axios.create({
  timeout: 90_000, // Render free tier cold start can take ~50s
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (import.meta.env.DEV) {
    const path = config.url || '';
    console.debug('[DropBridge API]', config.method?.toUpperCase(), `${config.baseURL}${path}`);
  }
  return config;
});

// Auth APIs — see authApi.js

// Transfer Session APIs
export const createSession = ({
  title,
  mode,
  storageHours,
  recipientEmail,
  senderDeviceId,
  senderDisplayName,
  targetDeviceId,
} = {}) => {
  const body = {};
  if (title) body.title = title;
  if (mode) body.mode = mode;
  if (storageHours != null) body.storageHours = storageHours;
  if (recipientEmail) body.recipientEmail = recipientEmail;
  if (senderDeviceId) body.senderDeviceId = senderDeviceId;
  if (senderDisplayName) body.senderDisplayName = senderDisplayName;
  if (targetDeviceId) body.targetDeviceId = targetDeviceId;

  return api.post('/transfers', body, {
    headers: {
      'X-Frontend-Origin': typeof window !== 'undefined' ? window.location.origin : '',
    },
  });
};

export const notifyRecipient = (sessionId) =>
  api.post(`/transfers/${sessionId}/notify`, null, {
    headers: {
      'X-Frontend-Origin': typeof window !== 'undefined' ? window.location.origin : '',
    },
  });

export const getSession = (sessionId) => api.get(`/transfers/${sessionId}`);

/** Send history — sessions you started while signed in. */
export const listSentTransferSessions = () => api.get('/transfers/mine/sent');

/** Receive history — sessions you joined while signed in. */
export const listReceivedTransferSessions = () => api.get('/transfers/mine/received');

/** @deprecated use listSentTransferSessions */
export const listMyTransferSessions = listSentTransferSessions;

/** Cloud files with presigned preview/download URLs (history detail panel). */
export const getSessionFiles = (sessionId) => api.get(`/transfers/${sessionId}/files`);

export const joinSessionById = (sessionId) => api.post(`/transfers/${sessionId}/join`);

export const joinSessionByCode = (shareCode) => api.post(`/transfers/join/${shareCode}`);

export const updateSessionStatus = (sessionId, status) =>
  api.put(`/transfers/${sessionId}/status`, null, { params: { status } });

/** After all cloud files are uploaded, mark session ready for download. */
export const finalizeCloudSession = (sessionId) =>
  api.post(`/transfers/${sessionId}/finalize-cloud`);

// File APIs
export const uploadFile = (sessionId, file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  return api.post(`/files/upload/${sessionId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });
};

export const getFilesBySession = (sessionId) => api.get(`/files/session/${sessionId}`);

/** Full URL for cloud file download (works on Vercel + local dev). */
export { getCloudFileDownloadUrl as getFileDownloadUrl } from '../lib/downloadFiles';

export const resolvePairingCode = (pairingCode) =>
  api.get(`/devices/resolve/${pairingCode}`);

export const isDeviceOnline = (deviceId) => api.get(`/devices/${deviceId}/online`);

// My Network (requires sign-in)
export const listContacts = () => api.get('/contacts');

export const addContact = (body, ownerDeviceId) =>
  api.post('/contacts', body, {
    params: ownerDeviceId ? { ownerDeviceId } : undefined,
  });

export const removeContact = (contactId) => api.delete(`/contacts/${contactId}`);

export default api;
