import { io, Socket } from "socket.io-client";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { useAuthStore } from "../stores/auth.store";

/**
 * Singleton Socket.IO partagé par toute l'app.
 * - Reconnecte automatiquement (avec backoff).
 * - Authentifie via le JWT du AuthStore (mobile) OU cookies httpOnly (web).
 * - Détecte plateforme (web ↔ mobile) — sur web on s'appuie sur la même URL que axios.
 */

const isWeb = Platform.OS === "web";

const getBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (isWeb) return "http://localhost:3000";
  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost?.split(":")[0];
  if (!localhost) {
    return Platform.OS === "android"
      ? "http://10.0.2.2:3000"
      : "http://localhost:3000";
  }
  return `http://${localhost}:3000`;
};

let socket: Socket | null = null;
let lastToken: string | null = null;

const NAMESPACE = "/ws/messaging";

export function getSocket(): Socket | null {
  const token = useAuthStore.getState().accessToken;
  const isAuthenticated = useAuthStore.getState().isAuthenticated;

  // Mobile : exige un token JWT dans le store (envoyé en handshake.auth.token).
  // Web : pas de token dans le store (cookies httpOnly) — on se fie à isAuthenticated.
  if (!isWeb && !token) {
    disconnectSocket();
    return null;
  }
  if (isWeb && !isAuthenticated) {
    disconnectSocket();
    return null;
  }

  // Si le token a changé (mobile) : on coupe et on recrée
  if (socket && !isWeb && lastToken !== token) {
    socket.disconnect();
    socket = null;
  }

  if (socket) return socket;

  lastToken = token;
  const baseUrl = getBaseUrl();
  socket = io(`${baseUrl}${NAMESPACE}`, {
    // Sur mobile on passe le token via auth ; sur web il sera lu côté backend
    // depuis le cookie httpOnly (grâce à withCredentials: true).
    ...(token ? { auth: { token } } : {}),
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    withCredentials: true,
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  lastToken = null;
}

/**
 * Force la reconnexion avec le token courant.
 * À appeler après un refresh d'access token (mobile).
 */
export function refreshSocketAuth(): void {
  const token = useAuthStore.getState().accessToken;
  if (!socket) return;
  if (lastToken === token) return;
  lastToken = token;
  if (token) socket.auth = { token };
  socket.disconnect();
  socket.connect();
}
