import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { platformStorage } from "./storage";
import { Skill, Cause } from "@repo/shared";
import { ReferenceService } from "../services/reference.service";

const TTL_MS = 15 * 60 * 1000; // 15 minutes

interface ReferenceState {
  skills: Skill[];
  causes: Cause[];
  isLoaded: boolean;
  isLoading: boolean;
  lastFetchedAt: number | null;

  /** Charge les listes depuis l'API si pas encore chargées ou si le cache est périmé */
  fetchReferences: () => Promise<void>;

  /** Force le rechargement depuis l'API */
  refreshReferences: () => Promise<void>;

  /** Vide le store */
  clearReferences: () => void;
}

export const useReferenceStore = create<ReferenceState>()(
  persist(
    (set, get) => ({
      skills: [],
      causes: [],
      isLoaded: false,
      isLoading: false,
      lastFetchedAt: null,

      fetchReferences: async () => {
        const { isLoaded, lastFetchedAt, isLoading } = get();

        // Si un chargement est déjà en cours, on ne double pas la requête
        if (isLoading) return;

        // Si les données sont chargées et encore fraîches, rien à faire
        const isStale = !lastFetchedAt || Date.now() - lastFetchedAt > TTL_MS;
        if (isLoaded && !isStale) return;

        set({ isLoading: true });
        try {
          const [skills, causes] = await Promise.all([
            ReferenceService.getSkills(),
            ReferenceService.getCauses(),
          ]);

          set({ skills, causes, isLoaded: true, lastFetchedAt: Date.now() });
        } catch (error) {
          console.warn("[ReferenceStore] Erreur chargement références:", error);
        } finally {
          set({ isLoading: false });
        }
      },

      refreshReferences: async () => {
        set({ isLoaded: false, lastFetchedAt: null });
        await get().fetchReferences();
      },

      clearReferences: () =>
        set({ skills: [], causes: [], isLoaded: false, isLoading: false, lastFetchedAt: null }),
    }),
    {
      name: "reference-storage",
      storage: createJSONStorage(() => platformStorage),
      partialize: (state) => ({
        skills: state.skills,
        causes: state.causes,
        isLoaded: state.isLoaded,
        lastFetchedAt: state.lastFetchedAt,
      }),
    },
  ),
);
