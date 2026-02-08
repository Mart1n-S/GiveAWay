import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { Platform } from "react-native";
import { useAuthStore } from "../stores/auth.store";
import Constants from "expo-constants";
import { Alert } from "react-native";

// Détection dynamique de l'URL
const getBaseUrl = () => {
  // 1. Priorité absolue : Si une URL est définie dans le .env (ex: Prod), on l'utilise
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Si on est sur le Web (Navigateur)
  if (Platform.OS === "web") {
    return "http://localhost:3000";
  }

  // 3. Récupération de l'adresse IP de l'hôte Expo
  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost?.split(":")[0];

  if (!localhost) {
    // 4. Fallback pour Émulateur Android pur (si hostUri est vide)
    return Platform.OS === "android"
      ? "http://10.0.2.2:3000"
      : "http://localhost:3000";
  }

  // 5. Cas Téléphone Physique : On utilise l'IP du PC
  return `http://${localhost}:3000`;
};

const BASE_URL = getBaseUrl();

// Détection du type de client (mobile ou web)
const CLIENT_TYPE = Platform.OS === "web" ? "web" : "mobile";

// 1. Instance principale
export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "x-client-type": CLIENT_TYPE,
  },
  // Indispensable pour que le Web envoie/reçoive les Cookies HttpOnly
  withCredentials: true,
  timeout: 10000,
});

// --- LOGIQUE DE QUEUE (Concurrency) ---

// Interface de la file d'attente
interface FailedRequest {
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
}

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 2. Intercepteur de REQUÊTE
api.interceptors.request.use(
  (config) => {
    // Sur Mobile : On a besoin du token du store
    if (CLIENT_TYPE === "mobile") {
      const token = useAuthStore.getState().accessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 3. Intercepteur de RÉPONSE
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response?.status;

    // =================================================================
    // 1. GESTION GLOBALE : RATE LIMITING (429)
    // =================================================================
    if (status === 429) {
      const apiError = error.response?.data as any;
      const message =
        apiError?.message ||
        "Oups ! Vous allez trop vite. Veuillez réessayer dans quelques instants.";

      // On affiche l'alerte ici pour bloquer l'utilisateur, quel que soit l'écran
      Alert.alert("Doucement ! ✋", message);

      // On rejette l'erreur pour que le composant puisse arrêter son loading spinner
      return Promise.reject(error);
    }

    // =================================================================
    // 2. GESTION GLOBALE : REFRESH TOKEN (401)
    // =================================================================
    if (status === 401 && !originalRequest._retry) {
      // A. On ignore le mécanisme de refresh si l'erreur vient :
      //    - Du Refresh lui-même (sinon boucle infinie)
      //    - Du Login (car c'est une erreur "Mauvais mot de passe", pas "Token expiré")
      if (
        originalRequest.url?.includes("/auth/refresh") ||
        originalRequest.url?.includes("/auth/login")
      ) {
        // Si c'était le refresh qui a échoué, on déconnecte vraiment (Session expirée)
        if (originalRequest.url?.includes("/auth/refresh")) {
          useAuthStore.getState().logout();
        }
        // Pour le login, on laisse l'erreur remonter au formulaire
        return Promise.reject(error);
      }

      // B. Début de la tentative de Refresh
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise<string | null>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers && token) {
              originalRequest.headers.Authorization = "Bearer " + token;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      isRefreshing = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;

        // Sur Mobile, le refresh token est obligatoire pour lancer la requête
        // Sur Web, il est dans les cookies, donc refreshToken peut être null ici
        if (CLIENT_TYPE === "mobile" && !refreshToken) {
          throw new Error("Pas de refresh token disponible");
        }

        // Appel API Refresh
        const response = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          {
            // Indispensable pour le Web (cookies httpOnly)
            withCredentials: true,
            headers:
              CLIENT_TYPE === "mobile" && refreshToken
                ? {
                    Authorization: `Bearer ${refreshToken}`,
                    "x-client-type": "mobile",
                  }
                : undefined,
          }
        );

        // --- GESTION DE LA RÉPONSE (Adaptative) ---

        // Cas MOBILE : Le back renvoie JSON { backendTokens: ... }
        if (CLIENT_TYPE === "mobile") {
          const { accessToken, refreshToken: newRefreshToken } =
            response.data.backendTokens || {};

          if (!accessToken || !newRefreshToken) {
            throw new Error("Réponse invalide (Mobile attend des tokens JSON)");
          }

          // Mise à jour du store manuel
          useAuthStore
            .getState()
            .setTokens(accessToken, newRefreshToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }

          processQueue(null, accessToken);
        }
        // Cas WEB : Le back a mis à jour les cookies (Set-Cookie)
        else {
          // Sur Web, les cookies sont mis à jour par le navigateur.
          // On relance juste la queue sans token manuel.
          processQueue(null, null);
        }

        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        console.log("Refresh token invalide ou expiré. Déconnexion.");
        useAuthStore.getState().logout();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);