import { Platform } from "react-native";
import { api } from "../lib/axios";
import { useAuthStore } from "../stores/auth.store";
import {
  LoginDto,
  RegisterDto,
  RegisterAssociationFormValues,
  AuthResponse,
  VerifyEmailDto,
  ResendVerificationDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  GoogleLoginDto,
} from "@repo/shared";
import { googleSignOut } from "../lib/google-signin";
import { useProfileStore } from "@/stores/profile.store";

export const AuthService = {
  // =================================================================
  // 1. AUTHENTIFICATION (Login / Register / Logout / Google)
  // =================================================================

  /**
   * POST /auth/login
   */
  login: async (credentials: LoginDto) => {
    const response = await api.post<AuthResponse>("/auth/login", credentials);
    const { user, backendTokens } = response.data;

    useAuthStore
      .getState()
      .login(
        user,
        backendTokens?.accessToken ?? null,
        backendTokens?.refreshToken ?? null,
      );

    useProfileStore.getState().setProfile(user);

    return user;
  },

  /**
   * POST /auth/google
   *
   * Authentifie un utilisateur via Google OAuth.
   * Gère deux cas selon la plateforme :
   * - `isAccessToken: true`  → web, Google a renvoyé un access_token
   * - `isAccessToken: false` → mobile, Google a renvoyé un id_token JWT
   *
   * @param data - DTO Google contenant le token et le flag isAccessToken
   * @returns L'utilisateur authentifié
   */
  googleLogin: async (data: GoogleLoginDto) => {
    const dto: GoogleLoginDto = {
      idToken: data.idToken,
      isAccessToken: data.isAccessToken,
    };

    const response = await api.post<AuthResponse>("/auth/google", dto, {
      headers: {
        "x-client-type": Platform.OS === "web" ? "web" : "mobile",
      },
    });

    const { user, backendTokens } = response.data;

    useAuthStore
      .getState()
      .login(
        user,
        backendTokens?.accessToken ?? null,
        backendTokens?.refreshToken ?? null,
      );

    useProfileStore.getState().setProfile(user);


    return user;
  },

  /**
   * POST /auth/register
   * Gère l'upload de fichier (Avatar) via FormData
   */
  register: async (data: RegisterDto, imageUri?: string) => {
    const formData = new FormData();

    // 1. Ajout des champs textes simples
    formData.append("email", data.email);
    formData.append("password", data.password);
    formData.append("confirmPassword", data.confirmPassword);
    formData.append("firstName", data.firstName);
    formData.append("lastName", data.lastName);
    formData.append("age", data.age.toString());
    formData.append("acceptTerms", data.acceptTerms.toString());

    if (data.biography) {
      formData.append("biography", data.biography);
    }

    // 2. Ajout de l'adresse (JSON Stringify)
    if (data.address) {
      formData.append("address", JSON.stringify(data.address));
    }

    // 3. Ajout de l'image
    if (imageUri) {
      if (Platform.OS === "web") {
        // Solution web
        const response = await fetch(imageUri);
        const blob = await response.blob();

        // On détermine l'extension à partir du type MIME du blob (plus fiable)
        const extension = blob.type.split("/")[1] || "jpg";
        const filename = `avatar-${Date.now()}.${extension}`;

        formData.append("profilePicture", blob, filename);
      } else {
        // Solution mobile
        const filename = imageUri.split("/").pop() || "avatar.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";

        const file = {
          uri: imageUri,
          name: filename,
          type,
        } as any;

        formData.append("profilePicture", file);
      }
    }

    // 4. Appel API
    const response = await api.post<{ message: string }>(
      "/auth/register",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );

    return response.data;
  },

  /**
   * POST /auth/register/association
   * Inscription combinée User (owner) + Association, avec logo et documents.
   */
  registerAssociation: async (
    data: RegisterAssociationFormValues,
    logo: {
      uri: string;
      name: string;
      type: string;
      webFile?: File;
    } | null,
    documents: Array<{
      uri: string;
      name: string;
      type: string;
      webFile?: File;
    }> = [],
    profilePicture: {
      uri: string;
      name: string;
      type: string;
      webFile?: File;
    } | null = null,
  ) => {
    const formData = new FormData();

    // 1. Champs utilisateur (futur owner)
    formData.append("firstName", data.firstName);
    formData.append("lastName", data.lastName);
    formData.append("email", data.email);
    formData.append("password", data.password);
    formData.append("confirmPassword", data.confirmPassword);
    formData.append("age", String(data.age));
    formData.append("acceptTerms", String(data.acceptTerms));

    if (data.biography) {
      formData.append("biography", data.biography);
    }

    if (data.userAddress) {
      formData.append("userAddress", JSON.stringify(data.userAddress));
    }

    // 2. Champs association
    formData.append("name", data.name);
    if (data.rna) formData.append("rna", data.rna);
    if (data.siret) formData.append("siret", data.siret);
    if (data.phone) formData.append("phone", data.phone);
    if (data.website) formData.append("website", data.website);
    if (data.description) formData.append("description", data.description);
    formData.append("object", data.object);
    formData.append("legalStatus", data.legalStatus);

    if (data.address) {
      formData.append("address", JSON.stringify(data.address));
    }

    // 3.a Photo de profil du owner (optionnelle)
    if (profilePicture) {
      if (Platform.OS === "web" && profilePicture.webFile) {
        formData.append("profilePicture", profilePicture.webFile, profilePicture.name);
      } else if (Platform.OS === "web") {
        const response = await fetch(profilePicture.uri);
        const blob = await response.blob();
        const extension = blob.type.split("/")[1] || "jpg";
        formData.append(
          "profilePicture",
          blob,
          `avatar-${Date.now()}.${extension}`,
        );
      } else {
        formData.append("profilePicture", {
          uri: profilePicture.uri,
          name: profilePicture.name,
          type: profilePicture.type,
        } as any);
      }
    }

    // 3.b Logo de l'association (optionnel)
    if (logo) {
      if (Platform.OS === "web" && logo.webFile) {
        formData.append("logo", logo.webFile, logo.name);
      } else if (Platform.OS === "web") {
        const response = await fetch(logo.uri);
        const blob = await response.blob();
        const extension = blob.type.split("/")[1] || "jpg";
        formData.append("logo", blob, `logo-${Date.now()}.${extension}`);
      } else {
        formData.append("logo", {
          uri: logo.uri,
          name: logo.name,
          type: logo.type,
        } as any);
      }
    }

    // 4. Documents (multiples sous la même clé "documents")
    for (const doc of documents) {
      if (Platform.OS === "web" && doc.webFile) {
        formData.append("documents", doc.webFile, doc.name);
      } else if (Platform.OS === "web") {
        const response = await fetch(doc.uri);
        const blob = await response.blob();
        formData.append("documents", blob, doc.name);
      } else {
        formData.append("documents", {
          uri: doc.uri,
          name: doc.name,
          type: doc.type,
        } as any);
      }
    }

    const response = await api.post<{
      message: string;
      requiresManualReview: boolean;
    }>("/auth/register/association", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return response.data;
  },

  /**
   * POST /auth/logout
   *
   * Déconnecte l'utilisateur de l'application et de Google (sur mobile).
   * Sur mobile : envoie le refresh token dans le body (pas de cookies).
   * Sur web : le navigateur envoie le cookie refresh_token automatiquement.
   *
   * Non bloquant : si l'API échoue, le store local est nettoyé quand même
   * pour ne pas bloquer l'utilisateur sur l'écran de connexion.
   */
  logout: async () => {
    try {
      // 1. On récupère le refresh token actuel du store
      const refreshToken = useAuthStore.getState().refreshToken;

      // Déconnexion Google native sur mobile
      // Import dynamique pour ne pas crasher sur Expo Go
      if (Platform.OS !== "web") {
        try {
          await googleSignOut();
        } catch (googleError) {
          console.warn("[AuthService] Google Sign-Out warning:", googleError);
        }
      }

      // 2. Logique conditionnelle pour le Body
      // Sur Mobile : Pas de cookies, donc on DOIT envoyer le token dans le body
      // pour que le backend puisse le trouver et le supprimer de la BDD.
      if (Platform.OS !== "web" && refreshToken) {
        await api.post("/auth/logout", { refreshToken });
      } else {
        // Sur Web : Le navigateur envoie le cookie 'refresh_token' automatiquement.
        await api.post("/auth/logout");
      }
    } catch (error) {
      // Si l'API échoue (ex: token déjà expiré ou serveur down),
      // on ne bloque pas l'utilisateur
      console.warn("[AuthService] Logout API warning:", error);
    } finally {
      // 3. Quoi qu'il arrive (succès ou erreur), on nettoie le store local (UI)
      // C'est ça qui redirige l'utilisateur vers l'écran de Login.
      useAuthStore.getState().logout();
    }
  },

  // =================================================================
  // 2. GESTION DE COMPTE (Verify)
  // =================================================================

  /**
   * POST /auth/verify
   * Validation de l'email via le code à 6 chiffres reçu par mail
   */
  verifyEmail: async (dto: VerifyEmailDto) => {
    // On envoie directement le DTO { code: "..." }
    const response = await api.post<{ message: string }>("/auth/verify", dto);
    return response.data;
  },

  /**
   * POST /auth/resend-verification
   * Demande le renvoi de l'email de validation.
   */
  resendVerificationEmail: async (dto: ResendVerificationDto) => {
    const response = await api.post<{ message: string }>(
      "/auth/resend-verification",
      dto,
    );
    return response.data;
  },

  // =================================================================
  // 3. MOT DE PASSE (Forgot / Reset / Change)
  // =================================================================

  /**
   * POST /auth/forgot-password
   * Envoie un email avec un lien de reset
   */
  forgotPassword: async (dto: ForgotPasswordDto) => {
    const response = await api.post<{ message: string }>(
      "/auth/forgot-password",
      dto,
    );
    return response.data;
  },

  /**
   * POST /auth/reset-password
   * Définit un nouveau mot de passe via le code reçu par mail
   */
  resetPassword: async (dto: ResetPasswordDto) => {
    const response = await api.post<{ message: string }>(
      "/auth/reset-password",
      dto,
    );
    return response.data;
  },

  /**
   * POST /auth/change-password
   * Change le mot de passe quand l'utilisateur est connecté
   */
  changePassword: async (
    oldPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) => {
    const response = await api.post<{ message: string }>(
      "/auth/change-password",
      {
        oldPassword,
        newPassword,
        confirmPassword,
      },
    );
    return response.data;
  },
};
