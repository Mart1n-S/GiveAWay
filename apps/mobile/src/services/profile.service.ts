import { api } from "../lib/axios";
import { useAuthStore } from "../stores/auth.store";
import { User, UpdateProfileDto, DeleteAccountDto } from "@repo/shared";
import { ReactNativeFile } from "../types/files.type";

export const ProfileService = {
  /**
   * GET /profile
   * Récupère le profil complet de l'utilisateur connecté.
   * Inclut les compétences, causes, disponibilités et historique des missions.
   */
  getProfile: async (): Promise<User> => {
    const response = await api.get<User>("/profile");

    // On met à jour le store global pour que toute l'UI en profite
    useAuthStore.getState().setUser(response.data);

    return response.data;
  },

  /**
   * PATCH /profile
   * Met à jour le profil de l'utilisateur connecté.
   * Envoie uniquement les champs modifiés via FormData (multipart)
   * pour supporter l'upload de photo de profil en même temps.
   *
   * @param data - Données partielles à mettre à jour
   * @param imageUri - URI de la nouvelle photo de profil (optionnel)
   */
  updateProfile: async (
    data: UpdateProfileDto,
    imageUri?: string,
  ): Promise<User> => {
    const formData = new FormData();

    // Infos de base
    if (data.firstName !== undefined) {
      formData.append("firstName", data.firstName);
    }
    if (data.lastName !== undefined) {
      formData.append("lastName", data.lastName);
    }
    if (data.age !== undefined) {
      formData.append("age", data.age.toString());
    }
    if (data.biography !== undefined) {
      formData.append("biography", data.biography ?? "");
    }

    // Adresse
    if (data.address !== undefined) {
      formData.append("address", JSON.stringify(data.address));
    }

    // Disponibilités
    if (data.availability !== undefined) {
      formData.append("availability", JSON.stringify(data.availability));
    }

    // Compétences & Causes
    if (data.skillIds !== undefined) {
      formData.append("skillIds", JSON.stringify(data.skillIds));
    }
    if (data.causeIds !== undefined) {
      formData.append("causeIds", JSON.stringify(data.causeIds));
    }

    // Photo de profil
    if (imageUri) {
      const filename = imageUri.split("/").pop() || "avatar.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";

      const file: ReactNativeFile = {
        uri: imageUri,
        name: filename,
        type,
      };

      formData.append("profilePicture", file as unknown as Blob);
    }

    const response = await api.patch<User>("/profile", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    // On met à jour le store global
    useAuthStore.getState().setUser(response.data);

    return response.data;
  },

  /**
   * DELETE /profile
   * Supprime définitivement le compte de l'utilisateur connecté.
   *
   * La confirmation diffère selon le type de compte :
   * - Compte email/password : champ `password`
   * - Compte Google : champ `confirmation` avec la valeur "SUPPRIMER"
   *
   * @param dto - DTO de confirmation
   */
  deleteAccount: async (dto: DeleteAccountDto): Promise<void> => {
    await api.delete("/profile", { data: dto });

    // Nettoyage du store local après suppression
    useAuthStore.getState().logout();
  },
};
