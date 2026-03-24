import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { platformStorage } from "./storage";
import { Skill, Cause } from "@repo/shared";
import { ReferenceService } from "../services/reference.service";

// Types

interface ReferenceState {
  skills: Skill[];
  causes: Cause[];
  isLoaded: boolean;
  isLoading: boolean;

  /** Charge les listes depuis l'API si pas encore chargées */
  fetchReferences: () => Promise<void>;

  /** Force le rechargement depuis l'API */
  refreshReferences: () => Promise<void>;

  /** Vide le store */
  clearReferences: () => void;
}

// Store

export const useReferenceStore = create<ReferenceState>()(
  persist(
    (set, get) => ({
      skills: [],
      causes: [],
      isLoaded: false,
      isLoading: false,

      fetchReferences: async () => {
        // Si déjà chargé, on ne refait pas la requête
        if (get().isLoaded) return;

        set({ isLoading: true });
        try {
          const [skills, causes] = await Promise.all([
            ReferenceService.getSkills(),
            ReferenceService.getCauses(),
          ]);

          set({ skills, causes, isLoaded: true });
        } catch (error) {
          console.warn("[ReferenceStore] Erreur chargement références:", error);
        } finally {
          set({ isLoading: false });
        }
      },

      refreshReferences: async () => {
        // Force le rechargement en réinitialisant isLoaded
        set({ isLoaded: false });
        await get().fetchReferences();
      },

      clearReferences: () =>
        set({ skills: [], causes: [], isLoaded: false, isLoading: false }),
    }),
    {
      name: "reference-storage",
      storage: createJSONStorage(() => platformStorage),
      // On persiste les listes - elles changent rarement
      partialize: (state) => ({
        skills: state.skills,
        causes: state.causes,
        isLoaded: state.isLoaded,
      }),
    },
  ),
);
