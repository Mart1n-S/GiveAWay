import { useEffect } from "react";
import { Stack, SplashScreen } from "expo-router";
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

export default function RootLayout() {
  // 2. Récupérer l'état d'hydratation depuis le store
  const isHydrated = useAuthStore((state) => state.isHydrated);

  useEffect(() => {
    // 3. Dès que le store a fini de charger
    if (isHydrated) {
      SplashScreen.hideAsync();
    }
  }, [isHydrated]);

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
