import { create } from 'zustand';

const useTransferStore = create((set, get) => ({
  selectedFiles: [],
  currentSession: null,
  uploadProgress: 0,
  transferStatus: 'idle',
  error: null,

  setFiles: (files) =>
    set({
      selectedFiles: Array.isArray(files) ? files : [],
      error: null,
    }),

  addFiles: (incoming) => {
    const list = Array.isArray(incoming) ? incoming : [incoming];
    set((state) => ({
      selectedFiles: [...state.selectedFiles, ...list],
      error: null,
    }));
  },

  removeFileAt: (index) =>
    set((state) => ({
      selectedFiles: state.selectedFiles.filter((_, i) => i !== index),
    })),

  clearFiles: () =>
    set({
      selectedFiles: [],
      uploadProgress: 0,
      transferStatus: 'idle',
      error: null,
    }),

  hasFiles: () => get().selectedFiles.length > 0,

  setSession: (session) => set({ currentSession: session }),
  clearSession: () => set({ currentSession: null }),

  setProgress: (progress) => set({ uploadProgress: progress }),
  setTransferStatus: (status) => set({ transferStatus: status }),
  setError: (error) => set({ error, transferStatus: 'error' }),

  reset: () =>
    set({
      selectedFiles: [],
      currentSession: null,
      uploadProgress: 0,
      transferStatus: 'idle',
      error: null,
    }),
}));

export default useTransferStore;
