import { Stack } from "expo-router";
import { Platform } from "react-native";
import { AppShell } from "@/components/layouts/AppShell";

export default function DevLayout() {
  const isWeb = Platform.OS === "web";

  return (
    <AppShell layoutType="subpage">
      <Stack
        screenOptions={{
          // Mobile: Header visible avec flèche retour
          // Web: Header caché (géré par WebNavBar)
          headerShown: !isWeb,
          headerBackTitle: "",
          headerTintColor: "#1F2937",
          headerTitleStyle: { fontWeight: "bold" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: "white" },
        }}
      >
        {/* TODO: Supprimer pour la production */}
        {/* TODO: Activer pour le dev */}
        {/* <Stack.Screen
          name="design-system"
          options={{ headerTitle: "Design System 🎨" }}
        />
        <Stack.Screen
          name="notifications"
          options={{ headerTitle: "Notifications 🔔" }}
        /> */}
      </Stack>
    </AppShell>
  );
}
