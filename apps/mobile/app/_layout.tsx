import { useEffect } from "react";
import { Stack, SplashScreen } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";
import "../global.css";

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
        */}
        <Stack.Screen
          name="(dev)/design-system"
          options={{
            headerShown: false,
            presentation: "modal",
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
