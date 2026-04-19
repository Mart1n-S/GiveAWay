import Toast from "react-native-toast-message";
import { isAxiosError } from "axios";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/stores/auth.store";
import type {
  AssociationCategory,
  AssociationMapItem,
  AssociationDto,
  AssociationMemberDto,
  UpdateAssociationDto,
  AddMemberDto,
  UpdateMemberRoleDto,
  TransferOwnerDto,
  AssociationPublicListResponse,
  AssociationPublicProfile,
} from "@repo/shared";

export interface PublicAssociationListQuery {
  search?: string;
  city?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  page?: number;
  pageSize?: number;
}

export async function getPublicAssociations(
  query: PublicAssociationListQuery = {},
): Promise<AssociationPublicListResponse> {
  const params: Record<string, string> = {};
  if (query.search) params.search = query.search;
  if (query.city) params.city = query.city;
  if (query.lat !== undefined) params.lat = String(query.lat);
  if (query.lng !== undefined) params.lng = String(query.lng);
  if (query.radius !== undefined) params.radius = String(query.radius);
  if (query.page !== undefined) params.page = String(query.page);
  if (query.pageSize !== undefined) params.pageSize = String(query.pageSize);

  try {
    const { data } = await api.get<AssociationPublicListResponse>(
      "/associations/public",
      { params },
    );
    return data;
  } catch {
    Toast.show({
      type: "error",
      text1: "Impossible de charger les associations",
      text2: "Vérifiez votre connexion et réessayez.",
      visibilityTime: 10000,
      onPress: () => Toast.hide(),
    });
    throw new Error("Impossible de charger les associations.");
  }
}

export async function getPublicAssociation(
  associationId: number,
): Promise<AssociationPublicProfile> {
  try {
    const { data } = await api.get<AssociationPublicProfile>(
      `/associations/public/${associationId}`,
    );
    return data;
  } catch (err) {
    if (isAxiosError(err)) {
      if (err.response?.status === 404) {
        throw new Error("Association introuvable.");
      }
    }
    throw new Error(
      "Impossible de charger l'association. Vérifiez votre connexion.",
    );
  }
}
import type { ReactNativeFile } from "@/components/multiple-documents-picker/multiple-documents-picker";

/** Filtres optionnels pour la recherche d'associations proches */
export interface NearbyFilters {
  categoryIds?: number[];
  createdAfter?: string; // ISO date yyyy-mm-dd
  createdBefore?: string; // ISO date yyyy-mm-dd
}

/**
 * Récupère les associations validées situées dans un rayon donné
 * autour d'un point géographique, avec filtres optionnels.
 */
export async function getNearbyAssociations(
  lat: number,
  lng: number,
  radius = 10,
  filters: NearbyFilters = {},
): Promise<AssociationMapItem[]> {
  const params: Record<string, string> = {
    lat: String(lat),
    lng: String(lng),
    radius: String(radius),
  };

  if (filters.categoryIds?.length) {
    params.categoryIds = filters.categoryIds.join(",");
  }
  if (filters.createdAfter) {
    params.createdAfter = filters.createdAfter;
  }
  if (filters.createdBefore) {
    params.createdBefore = filters.createdBefore;
  }

  try {
    const { data } = await api.get<AssociationMapItem[]>(
      "/associations/nearby",
      { params },
    );
    return data;
  } catch (err) {
    Toast.show({
      type: "error",
      text1: "Impossible de charger les associations",
      text2: "Vérifiez votre connexion et réessayez.",
      visibilityTime: 10000,
      onPress: () => Toast.hide(),
    });
    throw err;
  }
}

/**
 * Récupère la liste de toutes les catégories d'associations.
 * Utilisé pour alimenter les filtres de la carte.
 */
export async function getAssociationCategories(): Promise<
  AssociationCategory[]
> {
  try {
    const { data } = await api.get<AssociationCategory[]>(
      "/reference/association-categories",
    );
    return data;
  } catch (err) {
    Toast.show({
      type: "error",
      text1: "Impossible de charger les catégories",
      text2: "Vérifiez votre connexion et réessayez.",
      visibilityTime: 10000,
      onPress: () => Toast.hide(),
    });
    throw err;
  }
}

/**
 * GET /associations/:associationId
 * Retourne le profil complet d'une association (membres inclus).
 * Requiert d'être membre de l'association.
 */
export async function getAssociation(
  associationId: number,
): Promise<AssociationDto> {
  try {
    const { data } = await api.get<AssociationDto>(
      `/associations/${associationId}`,
    );
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response?.status === 403) {
        throw new Error("Vous n'êtes pas membre de cette association.");
      }
      if (error.response?.status === 404) {
        throw new Error("Association introuvable.");
      }
    }
    throw new Error(
      "Impossible de charger l'association. Vérifiez votre connexion.",
    );
  }
}

/**
 * PATCH /associations/:associationId
 * Met à jour les informations de l'association (OWNER uniquement).
 * Envoie du JSON si aucun fichier n'est fourni,
 * ou du multipart/form-data si un nouveau logo ou des documents sont ajoutés.
 */
export async function updateAssociation(
  associationId: number,
  dto: UpdateAssociationDto,
  logoFileUri?: string,
  newDocuments?: ReactNativeFile[],
): Promise<AssociationDto> {
  try {
    let response;

    const hasFiles = !!logoFileUri || (newDocuments && newDocuments.length > 0);

    if (hasFiles) {
      // ── Envoi multipart (logo et/ou documents) ─────────────────────
      const formData = new FormData();

      const scalarFields: (keyof UpdateAssociationDto)[] = [
        "name",
        "phone",
        "website",
        "description",
        "object",
        "legalStatus",
      ];
      scalarFields.forEach((key) => {
        const val = dto[key];
        if (val !== undefined) {
          formData.append(key, (val as string) ?? "");
        }
      });

      // Signal de suppression du logo (logoUrl = "")
      if (dto.logoUrl !== undefined) {
        formData.append("logoUrl", dto.logoUrl);
      }

      if (dto.address) {
        formData.append("address", JSON.stringify(dto.address));
      }
      if (dto.documentUrls) {
        formData.append("documentUrls", JSON.stringify(dto.documentUrls));
      }

      // Logo (nouveau fichier)
      if (logoFileUri) {
        if (Platform.OS === "web") {
          const fetchResponse = await fetch(logoFileUri);
          const blob = await fetchResponse.blob();
          const extension = blob.type.split("/")[1] || "jpg";
          formData.append("logo", blob, `logo-${Date.now()}.${extension}`);
        } else {
          const filename = logoFileUri.split("/").pop() || "logo.jpg";
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : "image/jpeg";
          formData.append("logo", { uri: logoFileUri, name: filename, type } as any);
        }
      }

      // Nouveaux documents
      if (newDocuments && newDocuments.length > 0) {
        for (const doc of newDocuments) {
          if (Platform.OS === "web" && doc.webFile) {
            formData.append("documents", doc.webFile, doc.name);
          } else if (Platform.OS === "web") {
            const fetchResponse = await fetch(doc.uri);
            const blob = await fetchResponse.blob();
            formData.append("documents", blob, doc.name);
          } else {
            formData.append("documents", { uri: doc.uri, name: doc.name, type: doc.type } as any);
          }
        }
      }

      response = await api.patch<AssociationDto>(
        `/associations/${associationId}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
    } else {
      // ── Envoi JSON standard ────────────────────────────────────────
      response = await api.patch<AssociationDto>(
        `/associations/${associationId}`,
        dto,
      );
    }

    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response?.status === 403) {
        throw new Error(
          "Vous n'avez pas les droits pour modifier cette association.",
        );
      }
      if (error.response?.status === 404) {
        throw new Error("Association introuvable.");
      }
      const apiError = error.response?.data;
      // Remonter l'objet d'erreur complet pour le mapping côté page
      if (apiError?.errors?.properties) throw error;
      const msg = apiError?.message;
      if (typeof msg === "string") throw new Error(msg);
    }
    throw new Error(
      "Impossible de mettre à jour l'association. Vérifiez votre connexion.",
    );
  }
}

/**
 * GET /associations/:associationId/members
 * Retourne la liste des membres de l'association.
 */
export async function getMembers(
  associationId: number,
): Promise<AssociationMemberDto[]> {
  try {
    const { data } = await api.get<AssociationMemberDto[]>(
      `/associations/${associationId}/members`,
    );
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response?.status === 403) {
        throw new Error("Accès non autorisé à la liste des membres.");
      }
      if (error.response?.status === 404) {
        throw new Error("Association introuvable.");
      }
    }
    throw new Error(
      "Impossible de charger les membres. Vérifiez votre connexion.",
    );
  }
}

/**
 * POST /associations/:associationId/members
 * Ajoute un membre par son email (OWNER ou ADMIN uniquement).
 */
export async function addMember(
  associationId: number,
  dto: AddMemberDto,
): Promise<AssociationMemberDto> {
  try {
    const { data } = await api.post<AssociationMemberDto>(
      `/associations/${associationId}/members`,
      dto,
    );
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response?.status === 403) {
        throw new Error(
          "Vous n'avez pas les droits pour ajouter des membres.",
        );
      }
      if (error.response?.status === 404) {
        throw new Error("Aucun utilisateur trouvé avec cet email.");
      }
      if (error.response?.status === 409) {
        const msg = error.response?.data?.message;
        throw new Error(
          typeof msg === "string" ? msg : "Cet utilisateur est déjà membre de l'association.",
        );
      }
      const msg = error.response?.data?.message;
      if (typeof msg === "string") throw new Error(msg);
    }
    throw new Error(
      "Impossible d'ajouter le membre. Vérifiez votre connexion.",
    );
  }
}

/**
 * PATCH /associations/:associationId/members/:memberId
 * Met à jour le rôle d'un membre (OWNER uniquement).
 */
export async function updateMemberRole(
  associationId: number,
  memberId: number,
  dto: UpdateMemberRoleDto,
): Promise<AssociationMemberDto> {
  try {
    const { data } = await api.patch<AssociationMemberDto>(
      `/associations/${associationId}/members/${memberId}`,
      dto,
    );
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response?.status === 403) {
        throw new Error(
          "Vous n'avez pas les droits pour modifier les rôles.",
        );
      }
      if (error.response?.status === 404) {
        throw new Error("Membre introuvable.");
      }
    }
    throw new Error(
      "Impossible de modifier le rôle. Vérifiez votre connexion.",
    );
  }
}

/**
 * DELETE /associations/:associationId/members/:memberId
 * Retire un membre de l'association (OWNER ou ADMIN).
 */
export async function removeMember(
  associationId: number,
  memberId: number,
): Promise<void> {
  try {
    await api.delete(`/associations/${associationId}/members/${memberId}`);
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response?.status === 403) {
        throw new Error(
          "Vous n'avez pas les droits pour retirer ce membre.",
        );
      }
      if (error.response?.status === 404) {
        throw new Error("Membre introuvable.");
      }
    }
    throw new Error(
      "Impossible de retirer le membre. Vérifiez votre connexion.",
    );
  }
}

/**
 * POST /associations/:associationId/transfer-owner
 * Transfère la propriété de l'association à un autre membre (OWNER uniquement).
 * L'OWNER actuel sera rétrogradé ADMIN et déconnecté.
 */
export async function transferOwner(
  associationId: number,
  dto: TransferOwnerDto,
): Promise<void> {
  try {
    await api.post(`/associations/${associationId}/transfer-owner`, dto);
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response?.status === 403) {
        throw new Error(
          "Vous n'avez pas les droits pour transférer la propriété.",
        );
      }
      if (error.response?.status === 404) {
        throw new Error("Membre cible introuvable.");
      }
      const msg = error.response?.data?.message;
      if (typeof msg === "string") throw new Error(msg);
    }
    throw new Error(
      "Impossible de transférer la propriété. Vérifiez votre connexion.",
    );
  }
}

/**
 * DELETE /associations/:associationId/leave
 * Permet à l'utilisateur connecté de quitter l'association.
 * Interdit pour le rôle OWNER (doit d'abord transférer la propriété).
 */
export async function leaveAssociation(associationId: number): Promise<void> {
  try {
    await api.delete(`/associations/${associationId}/leave`);
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response?.status === 403) {
        throw new Error(
          "Le propriétaire ne peut pas quitter l'association directement. Transférez d'abord la propriété.",
        );
      }
      const msg = error.response?.data?.message;
      if (typeof msg === "string") throw new Error(msg);
    }
    throw new Error(
      "Impossible de quitter l'association. Vérifiez votre connexion.",
    );
  }
}

/**
 * DELETE /associations/:associationId/documents/:documentId
 * Supprime un document justificatif (OWNER uniquement).
 * Implémenté via PATCH avec la liste des URLs restantes.
 */
export async function deleteDocument(
  associationId: number,
  documentId: number,
  allDocuments: { id: number; fileUrl: string }[],
): Promise<AssociationDto> {
  const remainingUrls = allDocuments
    .filter((d) => d.id !== documentId)
    .map((d) => d.fileUrl);
  return updateAssociation(associationId, { documentUrls: remainingUrls });
}

/**
 * GET /associations/:associationId/documents/:documentId/download
 * Télécharge un document justificatif (OWNER uniquement).
 *
 * Web : déclenche un téléchargement navigateur via un élément <a> temporaire.
 * Native : télécharge dans le dossier document de l'app puis ouvre le partage.
 *
 * @param filename - Nom de fichier suggéré (utilisé en fallback si le header manque).
 */
export async function downloadDocument(
  associationId: number,
  documentId: number,
  filename: string,
): Promise<void> {
  const endpoint = `/associations/${associationId}/documents/${documentId}/download`;

  if (Platform.OS === "web") {
    // ── Web : fetch authentifié → blob → <a download> ─────────────────
    const response = await api.get(endpoint, { responseType: "blob" });

    // Tenter d'extraire le nom de fichier depuis Content-Disposition
    const disposition = response.headers["content-disposition"] as
      | string
      | undefined;
    let downloadName = filename;
    if (disposition) {
      const match = /filename\*?=(?:UTF-8'')?["']?([^;"'\n]+)/i.exec(
        disposition,
      );
      if (match?.[1]) {
        downloadName = decodeURIComponent(match[1].replace(/['"]/g, ""));
      }
    }

    const blob: Blob = response.data;
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = downloadName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
    return;
  }

  // ── Native : FileSystem.downloadAsync + expo-sharing ──────────────
  const token = useAuthStore.getState().accessToken;
  const baseUrl = api.defaults.baseURL ?? "";
  const fullUrl = `${baseUrl}${endpoint}`;

  const localUri =
    (FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? "") +
    filename;

  const result = await FileSystem.downloadAsync(fullUrl, localUri, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (result.status !== 200) {
    throw new Error(`Téléchargement échoué (${result.status})`);
  }

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(result.uri, {
      mimeType: result.headers?.["content-type"] ?? "application/octet-stream",
      dialogTitle: "Ouvrir ou enregistrer le document",
      UTI: result.headers?.["content-type"] ?? "public.item",
    });
  }
}
