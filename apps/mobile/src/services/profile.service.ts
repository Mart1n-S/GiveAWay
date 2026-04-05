import { api } from "../lib/axios";
import { useAuthStore } from "../stores/auth.store";
import {
  User,
  UpdateProfileDto,
  DeleteAccountDto,
  UpdateNotificationsDto,
} from "@repo/shared";
import { useProfileStore } from "../stores/profile.store";
import { Platform } from "react-native";

export const ProfileService = {
  /**
   * GET /profile
   * Récupère le profil complet de l'utilisateur connecté.
   * D'abord depuis le store local pour une réponse instantanée, puis depuis l'API pour les données à jour.
   * Inclut les compétences, causes, disponibilités et historique des missions.
   */
  getProfile: async (): Promise<User> => {
    const store = useProfileStore.getState();

    if (store.profile && !store.isStale()) return store.profile;

    store.setLoading(true);
    try {
      const response = await api.get<User>("/profile");
      useProfileStore.getState().setProfile(response.data);
      return response.data;
    } finally {
      useProfileStore.getState().setLoading(false);
    }
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
    removeImage?: boolean,
  ): Promise<User> => {
    const formData = new FormData();

    // Champs obligatoires
    formData.append("firstName", data.firstName);
    formData.append("lastName", data.lastName);
    formData.append("age", data.age.toString());
    formData.append("address", JSON.stringify(data.address));

    // Champs optionnels
    if (data.biography !== undefined) {
      formData.append("biography", data.biography ?? "");
    }

    if (data.availability !== undefined) {
      formData.append("availability", JSON.stringify(data.availability));
    }

    if (data.skillIds !== undefined) {
      formData.append("skillIds", JSON.stringify(data.skillIds));
    }

    if (data.causeIds !== undefined) {
      formData.append("causeIds", JSON.stringify(data.causeIds));
    }

    // Suppression explicite de la photo
    if (removeImage) {
      formData.append("removeProfilePicture", "true");
    }

    // Nouvelle photo (priorité sur removeImage)
    if (imageUri) {
      if (Platform.OS === "web") {
        // Pour le Web : on transforme le blob URL en vrai Blob binaire
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const extension = blob.type.split("/")[1] || "jpg";
        formData.append(
          "profilePicture",
          blob,
          `avatar-${Date.now()}.${extension}`,
        );
      } else {
        // Pour Mobile : format spécifique à React Native
        const filename = imageUri.split("/").pop() || "avatar.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";
        formData.append("profilePicture", {
          uri: imageUri,
          name: filename,
          type,
        } as any);
      }
    }

    // Appel API
    const response = await api.patch<User>("/profile", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    useProfileStore.getState().setProfile(response.data);

    return response.data;
  },

  /**
   * PATCH /profile/notifications
   * Met à jour les préférences de notifications de l'utilisateur connecté.
   */
  updateNotifications: async (dto: UpdateNotificationsDto): Promise<User> => {
    const response = await api.patch<User>("/profile/notifications", dto);

    useProfileStore.getState().setProfile(response.data);

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
