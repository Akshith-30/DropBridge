import { useEffect } from 'react';
import { fetchMe } from '../services/authApi';
import useAuthStore from '../store/authStore';
import { onAuthChangeForNetwork } from '../store/networkPresenceStore';

/** Validates stored JWT on load; clears invalid tokens. */
export default function AuthBootstrap() {
  const token = useAuthStore((s) => s.token);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const updateUser = useAuthStore((s) => s.updateUser);

  useEffect(() => {
    if (!token) {
      onAuthChangeForNetwork();
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    fetchMe()
      .then((res) => updateUser(res.data))
      .catch(() => clearAuth());
  }, [token, clearAuth, updateUser]);

  return null;
}
