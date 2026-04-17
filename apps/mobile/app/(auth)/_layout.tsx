import { Stack, Redirect } from "expo-router";
import { Platform, ActivityIndicator, View } from "react-native";
import { AppShell } from "@/components/layouts/AppShell";
import { useAuthStore } from "@/stores/auth.store";
import { colors } from "@/components/ui";

export default function AuthLayout() {
  const isWeb = Platform.OS === "web";
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  if (!isHydrated) {
    return (
      <View className="items-center justify-center flex-1 bg-white">
        <ActivityIndicator size="large" color={colors.primary.default} />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/" />;
  }

  return (
    <AppShell layoutType="subpage">
      <Stack
        screenOptions={{
          // Mobile: Header visible (natif)
          // Web: Header caché (car AppShell affiche la NavBar)
          headerShown: !isWeb,
          headerBackTitle: "Retour",
          headerTintColor: "#CC460F",
          headerTitleStyle: { fontWeight: "bold" },
          headerTitle: "",
          headerShadowVisible: false,
          contentStyle: { backgroundColor: "#f6f7f8" },
        }}
      >
        <Stack.Screen name="connexion" options={{ headerTitle: "Connexion" }} />
        <Stack.Screen
          name="inscription/index"
          options={{ headerTitle: "Inscription" }}
        />
      </Stack>
    </AppShell>
  );
}
