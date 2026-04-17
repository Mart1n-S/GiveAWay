import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { platformStorage } from "./storage";
import { MissionService } from "../services/mission.service";

const TTL_MS = 15 * 60 * 1000; // 15 minutes

interface RefItem {
  id: number;
  label: string;
}

interface FilterReferencesState {
  publicTypes: RefItem[];
  volunteerTypes: RefItem[];
  isLoaded: boolean;
  isLoading: boolean;
  lastFetchedAt: number | null;

  /** Charge les listes depuis l'API si pas encore chargées ou si le cache est périmé */
  fetchFilterReferences: () => Promise<void>;

  /** Force le rechargement depuis l'API */
  refreshFilterReferences: () => Promise<void>;

  /** Vide le store */
  clearFilterReferences: () => void;
}

export const useFilterReferencesStore = create<FilterReferencesState>()(
  persist(
    (set, get) => ({
      publicTypes: [],
      volunteerTypes: [],
      isLoaded: false,
      isLoading: false,
      lastFetchedAt: null,

      fetchFilterReferences: async () => {
        const { isLoaded, lastFetchedAt, isLoading } = get();

        if (isLoading) return;

        const isStale = !lastFetchedAt || Date.now() - lastFetchedAt > TTL_MS;
        if (isLoaded && !isStale) return;

        set({ isLoading: true });
        try {
          const [publicTypes, volunteerTypes] = await Promise.all([
            MissionService.getPublicTypes(),
            MissionService.getVolunteerTypes(),
          ]);

          set({
            publicTypes,
            volunteerTypes,
            isLoaded: true,
            lastFetchedAt: Date.now(),
          });
        } catch (error) {
          console.warn(
            "[FilterReferencesStore] Erreur chargement références:",
            error,
          );
        } finally {
          set({ isLoading: false });
        }
      },

      refreshFilterReferences: async () => {
        set({ isLoaded: false, lastFetchedAt: null });
        await get().fetchFilterReferences();
      },

      clearFilterReferences: () =>
        set({
          publicTypes: [],
          volunteerTypes: [],
          isLoaded: false,
          isLoading: false,
          lastFetchedAt: null,
        }),
    }),
    {
      name: "filter-references-storage",
      storage: createJSONStorage(() => platformStorage),
      partialize: (state) => ({
        publicTypes: state.publicTypes,
        volunteerTypes: state.volunteerTypes,
        isLoaded: state.isLoaded,
        lastFetchedAt: state.lastFetchedAt,
      }),
    },
  ),
);
