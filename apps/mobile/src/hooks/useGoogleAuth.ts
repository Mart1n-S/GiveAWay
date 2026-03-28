import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { GoogleLoginDto } from "@repo/shared";
import { googleSignIn, statusCodes } from "../lib/google-signin";

// Indispensable pour fermer correctement la popup OAuth sur web
WebBrowser.maybeCompleteAuthSession();

/**
 * Hook unifié pour l'authentification Google.
 *
 * Stratégie selon la plateforme :
 * - **Web** : `expo-auth-session` avec flow PKCE. Google renvoie un `access_token`
 *   (implicit flow) → on appelle l'endpoint UserInfo pour récupérer les infos utilisateur.
 * - **Mobile** (iOS/Android) : `@react-native-google-signin` qui utilise le SDK natif Google.
 *   Google renvoie directement un `id_token` JWT vérifié côté backend.
 *
 * Si `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` est absent (CI, tests),
 * le hook est désactivé sans erreur.
 *
 * @param onSuccess - Callback appelé avec le DTO Google une fois l'auth réussie
 * @returns `signInWithGoogle` pour déclencher le flow, `isLoading` et `isReady`
 */
export const useGoogleAuth = (
  onSuccess: (dto: GoogleLoginDto) => Promise<void>,
) => {
  const [isLoading, setIsLoading] = useState(false);

  // Ref pour stabiliser le callback et éviter les appels multiples
  // causés par la recréation de la fonction parente à chaque render
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  // WEB : expo-auth-session
  // null désactive complètement le hook quand webClientId est absent
  // (CI, tests, dev sans Google configuré)
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const isGoogleAuthAvailable = !!webClientId;

  const webConfig = {
    webClientId: webClientId ?? "",
    scopes: ["openid", "profile", "email"],
  };

  const mobileConfig = {
    webClientId: webClientId ?? "",
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    scopes: ["openid", "profile", "email"],
  };

  let googleAuthConfig;

  if (!isGoogleAuthAvailable) {
    googleAuthConfig = undefined;
  } else {
    googleAuthConfig = Platform.OS === "web" ? webConfig : mobileConfig;
  }

  const [request, response, promptAsync] =
    Google.useAuthRequest(googleAuthConfig);

  // Écoute la réponse OAuth - web uniquement
  useEffect(() => {
    if (Platform.OS !== "web" || !response) return;

    if (response.type === "success") {
      const params = response.params as Record<string, string>;
      const id_token = params["id_token"];
      const access_token = params["access_token"];

      if (id_token) {
        // Cas nominal web : id_token JWT présent
        onSuccessRef
          .current({ idToken: id_token, isAccessToken: false })
          .finally(() => setIsLoading(false));
        return;
      }

      if (access_token) {
        // Fallback web : Google renvoie un access_token sans id_token
        // On l'échange contre les infos utilisateur via UserInfo endpoint
        fetchUserInfoAndLogin(access_token);
        return;
      }

      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [response]);

  // MOBILE : @react-native-google-signin
  /**
   * Déclenche le flow Google natif sur iOS/Android.
   * Utilise le SDK Google Play Services (Android) ou GoogleSignIn (iOS).
   * Renvoie toujours un id_token JWT signé par Google.
   *
   * Import dynamique pour ne pas crasher sur Expo Go
   * (module natif absent dans le sandbox Expo Go).
   */
  const signInWithGoogleNative = async () => {
    try {
      setIsLoading(true);
      const idToken = await googleSignIn();
      await onSuccessRef.current({ idToken, isAccessToken: false });
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // L'utilisateur a fermé la popup
      } else if (err.code === statusCodes.IN_PROGRESS) {
        // Sign-in déjà en cours
      } else {
        throw error;
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback web : UserInfo endpoint
  /**
   * Échange un access_token Google contre les infos utilisateur
   * via l'endpoint UserInfo de Google. Utilisé uniquement sur web
   * quand Google ne renvoie pas d'id_token.
   */
  const fetchUserInfoAndLogin = async (accessToken: string) => {
    try {
      const userInfoUrl = process.env.EXPO_PUBLIC_GOOGLE_USERINFO_URL;

      if (!userInfoUrl) {
        throw new Error("EXPO_PUBLIC_GOOGLE_USERINFO_URL n'est pas définie");
      }

      const res = await fetch(userInfoUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) throw new Error(`UserInfo HTTP ${res.status}`);

      await res.json();

      // On attend que onSuccessRef se termine pour propager les erreurs
      await onSuccessRef.current({ idToken: accessToken, isAccessToken: true });
    } finally {
      setIsLoading(false);
    }
  };

  // Entrée unifiée
  /**
   * Déclenche le flow Google selon la plateforme.
   * - Web : ouvre une popup OAuth via expo-auth-session
   * - Mobile : ouvre la modale Google native via @react-native-google-signin
   * - Si Google Auth non configuré : no-op silencieux
   */
  const signInWithGoogle = async () => {
    if (Platform.OS === "web") {
      if (!isGoogleAuthAvailable || !request) return;
      setIsLoading(true);
      try {
        await promptAsync();
      } catch {
        setIsLoading(false);
      }
    } else {
      await signInWithGoogleNative();
    }
  };

  return {
    signInWithGoogle,
    isLoading,
    // Sur web : désactivé si Google Auth non configuré ou request pas prête
    // Sur mobile : toujours actif car le SDK natif n'a pas de phase d'init
    isReady: Platform.OS === "web" ? isGoogleAuthAvailable && !!request : true,
  };
};
