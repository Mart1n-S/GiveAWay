import { create } from "zustand";

interface PreferencesState {
  /** Active la mise en avant des missions matchées sur le profil utilisateur.
   *  Volontairement NON persisté : on ne veut pas qu'un toggle activé pour
   *  un compte reste actif après changement d'utilisateur. */
  highlightMatching: boolean;

  setHighlightMatching: (v: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()((set) => ({
  highlightMatching: false,
  setHighlightMatching: (v) => set({ highlightMatching: v }),
}));
