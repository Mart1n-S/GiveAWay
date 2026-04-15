import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { platformStorage } from "./storage";
import type {
  AssociationDto,
  AssociationMemberDto,
  UpdateAssociationDto,
  AddMemberDto,
  UpdateMemberRoleDto,
} from "@repo/shared";
import { AssociationRole } from "@repo/shared";
import * as AssociationService from "@/services/association.service";
import type { ReactNativeFile } from "@/components/multiple-documents-picker/multiple-documents-picker";
import { useAuthStore } from "./auth.store";

const TTL_MS = 5 * 60 * 1000; // 5 minutes

interface AssociationState {
  association: AssociationDto | null;
  members: AssociationMemberDto[] | null;
  /** Rôle de l'utilisateur connecté dans cette association */
  userRole: AssociationRole | null;
  associationId: number | null;
  isLoading: boolean;
  lastFetchedAt: number | null;

  isStale: () => boolean;
  /**
   * Charge l'association et ses membres depuis l'API.
   * Ignoré si les données sont encore fraîches (< 5 min).
   */
  fetchAssociation: (associationId: number) => Promise<void>;
  /**
   * Met à jour les informations de l'association (OWNER uniquement).
   * Marque le cache comme périmé après la mise à jour.
   * Si logoFileUri ou newDocuments sont fournis, envoie en multipart/form-data.
   */
  updateAssociation: (
    associationId: number,
    dto: UpdateAssociationDto,
    logoFileUri?: string,
    newDocuments?: ReactNativeFile[],
  ) => Promise<void>;
  /**
   * Ajoute un membre par email, puis rafraîchit la liste des membres.
   */
  addMember: (associationId: number, dto: AddMemberDto) => Promise<void>;
  /**
   * Met à jour le rôle d'un membre directement dans le store.
   */
  updateMemberRole: (
    associationId: number,
    memberId: number,
    dto: UpdateMemberRoleDto,
  ) => Promise<void>;
  /**
   * Retire un membre et le supprime du store local.
   */
  removeMember: (associationId: number, memberId: number) => Promise<void>;
  /**
   * Marque le cache comme périmé sans effacer les données.
   * Le prochain `fetchAssociation` rechargera les données depuis l'API.
   * À appeler après une mise à jour de profil pour que la photo soit fraîche.
   */
  invalidateCache: () => void;
  /** Réinitialise tout le store (à appeler à la déconnexion). */
  clearAssociation: () => void;
}

export const useAssociationStore = create<AssociationState>()(
  persist(
    (set, get) => ({
      association: null,
      members: null,
      userRole: null,
      associationId: null,
      isLoading: false,
      lastFetchedAt: null,

      isStale: () => {
        const { lastFetchedAt } = get();
        if (!lastFetchedAt) return true;
        return Date.now() - lastFetchedAt > TTL_MS;
      },

      fetchAssociation: async (associationId: number) => {
        const state = get();
        if (state.associationId === associationId && !state.isStale()) return;

        set({ isLoading: true });
        try {
          const association =
            await AssociationService.getAssociation(associationId);
          const members = association.members;

          const currentUser = useAuthStore.getState().user;
          const currentMember = members.find(
            (m) => m.userId === currentUser?.id,
          );

          set({
            association,
            members,
            userRole: currentMember?.role ?? null,
            associationId,
            lastFetchedAt: Date.now(),
          });
        } finally {
          set({ isLoading: false });
        }
      },

      updateAssociation: async (
        associationId: number,
        dto: UpdateAssociationDto,
        logoFileUri?: string,
        newDocuments?: ReactNativeFile[],
      ) => {
        const updated = await AssociationService.updateAssociation(
          associationId,
          dto,
          logoFileUri,
          newDocuments,
        );
        set({ association: updated, lastFetchedAt: null });
      },

      addMember: async (associationId: number, dto: AddMemberDto) => {
        await AssociationService.addMember(associationId, dto);
        const members = await AssociationService.getMembers(associationId);
        set({ members, lastFetchedAt: null });
      },

      updateMemberRole: async (
        associationId: number,
        memberId: number,
        dto: UpdateMemberRoleDto,
      ) => {
        const updated = await AssociationService.updateMemberRole(
          associationId,
          memberId,
          dto,
        );
        set((state) => ({
          members: state.members
            ? state.members.map((m) => (m.id === memberId ? updated : m))
            : null,
          lastFetchedAt: null,
        }));
      },

      removeMember: async (associationId: number, memberId: number) => {
        await AssociationService.removeMember(associationId, memberId);
        set((state) => ({
          members: state.members
            ? state.members.filter((m) => m.id !== memberId)
            : null,
          lastFetchedAt: null,
        }));
      },

      invalidateCache: () => set({ lastFetchedAt: null }),

      clearAssociation: () =>
        set({
          association: null,
          members: null,
          userRole: null,
          associationId: null,
          isLoading: false,
          lastFetchedAt: null,
        }),
    }),
    {
      name: "association-storage",
      storage: createJSONStorage(() => platformStorage),
      partialize: (state) => ({
        association: state.association,
        members: state.members,
        userRole: state.userRole,
        associationId: state.associationId,
        lastFetchedAt: state.lastFetchedAt,
      }),
    },
  ),
);
