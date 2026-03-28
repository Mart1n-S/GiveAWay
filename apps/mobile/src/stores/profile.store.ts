import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { platformStorage } from "./storage";
import { User } from "@repo/shared";

interface ProfileState {
  profile: User | null;
  isLoading: boolean;

  setProfile: (profile: User) => void;
  updateProfile: (partial: Partial<User>) => void;
  clearProfile: () => void;
  setLoading: (isLoading: boolean) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      isLoading: false,

      setProfile: (profile) => set({ profile }),

      updateProfile: (partial) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...partial } : null,
        })),

      clearProfile: () => set({ profile: null, isLoading: false }),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: "profile-storage",
      storage: createJSONStorage(() => platformStorage),
      // On ne persiste que le profil — pas l'état de chargement
      partialize: (state) => ({ profile: state.profile }),
    },
  ),
);
