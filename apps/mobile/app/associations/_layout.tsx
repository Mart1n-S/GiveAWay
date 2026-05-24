import { Stack } from "expo-router";
import { Platform } from "react-native";
import { AppShell } from "@/components/layouts/AppShell";

export default function AssociationPublicLayout() {
  const isWeb = Platform.OS === "web";

  return (
    <AppShell layoutType="subpage">
      <Stack
        screenOptions={{
          headerShown: !isWeb,
          headerBackTitle: "Retour",
          headerTintColor: "#CC460F",
          headerTitleStyle: { fontWeight: "bold" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: "#f6f7f8" },
        }}
      >
        <Stack.Screen name="[id]" options={{ title: "Association" }} />
      </Stack>
    </AppShell>
  );
}
