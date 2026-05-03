import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminResponse } from '@repo/shared';

interface AuthState {
  admin: AdminResponse | null;
  isHydrated: boolean;
  set: (admin: AdminResponse | null) => void;
  clear: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      admin: null,
      isHydrated: false,
      set: (admin) => set({ admin }),
      clear: () => set({ admin: null }),
      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'admin-auth',
      partialize: (s) => ({ admin: s.admin }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
