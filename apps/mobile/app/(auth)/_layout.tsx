import { Stack } from "expo-router";
import { Platform } from "react-native";
import { AppShell } from "../../src/components/layouts/AppShell";

export default function AuthLayout() {
  const isWeb = Platform.OS === "web";

  return (
    <AppShell layoutType="subpage">
      <Stack
        screenOptions={{
          // Mobile: Header visible (natif)
          // Web: Header caché (car AppShell affiche la NavBar)
          headerShown: !isWeb,
          headerBackTitle: "",
          headerTintColor: "#1F2937",
          headerTitleStyle: { fontWeight: "bold" },
          headerTitle: "",
          headerShadowVisible: false,
          contentStyle: { backgroundColor: "white" },
        }}
      >
        <Stack.Screen name="connexion" options={{ headerTitle: "Connexion" }} />
        <Stack.Screen
          name="inscription"
          options={{ headerTitle: "Inscription" }}
        />
      </Stack>
    </AppShell>
  );
}
