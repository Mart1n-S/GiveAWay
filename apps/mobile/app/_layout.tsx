import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { Stack, SplashScreen, useRouter } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";

// Nécessaire en prod (SSR) : ferme la popup OAuth quand Google redirige
// vers la racine de l'app plutôt que vers /connexion
WebBrowser.maybeCompleteAuthSession();
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";
import Toast from "react-native-toast-message";
import { toastConfig } from "@/components/ui";
import * as Notifications from "expo-notifications";
import { ProfileService } from "@/services/profile.service";
import "../global.css";

// Affiche les notifications même quand l'app est au premier plan
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Import du store
import { useAuthStore } from "../src/stores/auth.store";

// 1. Empêcher l'écran de splash natif de disparaître automatiquement
SplashScreen.preventAutoHideAsync();

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

async function registerPushToken(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    const finalStatus =
      existing === "granted"
        ? existing
        : (await Notifications.requestPermissionsAsync()).status;
    if (finalStatus !== "granted") return;

    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    await ProfileService.registerPushToken({ pushToken: tokenData.data });
  } catch {
    // Non-bloquant : si l'enregistrement échoue, l'app fonctionne quand même
  }
}

export default function RootLayout() {
  // 2. Récupérer l'état d'hydratation depuis le store
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // 3. Dès que le store a fini de charger
    if (isHydrated) {
      SplashScreen.hideAsync();
    }
  }, [isHydrated]);

  // Enregistrement du push token dès que l'utilisateur se connecte
  useEffect(() => {
    if (isAuthenticated) {
      void registerPushToken();
    }
  }, [isAuthenticated]);

  // Deep link : navigation vers la mission ou la conversation au tap sur une notification
  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data ?? {};
        const missionId = (data as { missionId?: unknown }).missionId;
        const type = (data as { type?: unknown }).type;
        const conversationId = (data as { conversationId?: unknown }).conversationId;

        if (type === "message" && typeof conversationId === "number") {
          router.push(`/messages/${conversationId}`);
          return;
        }
        if (typeof missionId === "number") {
          router.push(`/missions/${missionId}`);
        }
      },
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [router]);

  // 4. Tant que ce n'est pas chargé, on ne rend RIEN
  if (!isHydrated) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#FFFFFF" },
        }}
      >
        {/* Route Index (Landing Page / Redirection) */}
        <Stack.Screen name="index" />

        {/* Groupe AUTH (Login, Register...) 
           On pointe vers le dossier (auth).
        */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />

        {/* Groupe DEV (Design System...) 
           On pointe vers le dossier (dev) et on dit que tout ce qui est dedans
           s'ouvrira comme une Modale par-dessus le reste.
           TODO: Activer pour le dev
        */}
        {/* <Stack.Screen
          name="(dev)"
          options={{
            headerShown: false,
            presentation: "modal",
          }}
        /> */}
        <Stack.Screen name="(main)" options={{ headerShown: false }} />
      </Stack>
      <Toast config={toastConfig} />
    </SafeAreaProvider>
  );
}
