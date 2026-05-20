import { create } from 'zustand';

const TOKEN_KEY = 'dropbridge_access_token';
const USER_KEY = 'dropbridge_user';

function loadToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function loadUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const useAuthStore = create((set) => ({
  token: loadToken(),
  user: loadUser(),
  isHydrated: true,

  setAuth: ({ accessToken, user }) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token: accessToken, user });
  },

  clearAuth: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null });
  },

  updateUser: (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user });
  },
}));

export function getAccessToken() {
  return useAuthStore.getState().token;
}

export default useAuthStore;
