import { Platform } from "react-native";
import { api } from "../lib/axios";
import { useAuthStore } from "../stores/auth.store";
import {
  LoginDto,
  RegisterDto,
  User,
  AuthResponse,
  VerifyEmailDto,
  ResendVerificationDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from "@repo/shared";
import { ReactNativeFile } from "../types/files.type";

export const AuthService = {
  // =================================================================
  // 1. AUTHENTIFICATION (Login / Register / Logout)
  // =================================================================

  /**
   * POST /auth/login
   */
  login: async (credentials: LoginDto) => {
    const response = await api.post<AuthResponse>("/auth/login", credentials);
    const { user, backendTokens } = response.data;

    // On appelle toujours login, peu importe la plateforme
    useAuthStore
      .getState()
      .login(
        user,
        backendTokens?.accessToken ?? null,
        backendTokens?.refreshToken ?? null,
      );

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

    // 3. Ajout de l'image (Spécifique React Native)
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
   * POST /auth/logout
   */
  logout: async () => {
    try {
      // 1. On récupère le refresh token actuel du store
      const refreshToken = useAuthStore.getState().refreshToken;

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
      // on ne bloque pas l'utilisateur, on log juste l'erreur.
      console.log("Logout API warning:", error);
    } finally {
      // 3. Quoi qu'il arrive (succès ou erreur), on nettoie le store local (UI)
      // C'est ça qui redirige l'utilisateur vers l'écran de Login.
      useAuthStore.getState().logout();
    }
  },

  // =================================================================
  // 2. GESTION DE COMPTE (Me / Verify)
  // =================================================================

  /**
   * GET /auth/me
   * Récupère le profil à jour grâce au Token (envoyé auto par axios)
   */
  getProfile: async () => {
    // Axios injecte automatiquement le token Bearer via l'intercepteur
    const response = await api.get<User>("/auth/me");

    // On met à jour le store global pour que toute l'UI en profite
    useAuthStore.getState().setUser(response.data);

    return response.data;
  },

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
