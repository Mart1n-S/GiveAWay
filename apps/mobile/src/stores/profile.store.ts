import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { platformStorage } from "./storage";
import { User } from "@repo/shared";

const TTL_MS = 15 * 60 * 1000; // 15 minutes

interface ProfileState {
  profile: User | null;
  isLoading: boolean;
  lastFetchedAt: number | null;

  setProfile: (profile: User) => void;
  /** Stocke le profil pour affichage immédiat (ex: post-login) mais le marque stale
   *  pour forcer un rechargement complet au prochain getProfile(). */
  setProfileFromAuth: (profile: User) => void;
  updateProfile: (partial: Partial<User>) => void;
  clearProfile: () => void;
  setLoading: (isLoading: boolean) => void;
  isStale: () => boolean;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      isLoading: false,
      lastFetchedAt: null,

      setProfile: (profile) => set({ profile, lastFetchedAt: Date.now() }),

      setProfileFromAuth: (profile) => set({ profile, lastFetchedAt: null }),

      updateProfile: (partial) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...partial } : null,
        })),

      clearProfile: () => set({ profile: null, isLoading: false, lastFetchedAt: null }),

      setLoading: (isLoading) => set({ isLoading }),

      isStale: () => {
        const { lastFetchedAt } = get();
        if (!lastFetchedAt) return true;
        return Date.now() - lastFetchedAt > TTL_MS;
      },
    }),
    {
      name: "profile-storage",
      storage: createJSONStorage(() => platformStorage),
      partialize: (state) => ({
        profile: state.profile,
        lastFetchedAt: state.lastFetchedAt,
      }),
    },
  ),
);
