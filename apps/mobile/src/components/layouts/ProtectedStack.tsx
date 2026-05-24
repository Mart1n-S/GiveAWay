import { Redirect, Stack } from "expo-router";
import { Platform, ActivityIndicator, View } from "react-native";
import { useAuthStore } from "@/stores/auth.store";
import { colors } from "@/components/ui";

interface ProtectedStackProps {
  children: React.ReactNode;
  contentStyle?: { backgroundColor: string };
  /**
   * Force la route initiale du Stack — utile quand on accède directement à
   * une sous-route en deep-link (ex : /messages/:id) pour que la racine du
   * stack ("index") soit toujours présente en dessous → le bouton retour
   * natif fonctionne et revient à la liste.
   */
  initialRouteName?: string;
}

export function ProtectedStack({
  children,
  contentStyle = { backgroundColor: "#f6f7f8" },
  initialRouteName,
}: ProtectedStackProps) {
  const isWeb = Platform.OS === "web";
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  if (!isHydrated) {
    return (
      <View className="items-center justify-center flex-1 bg-grey-50">
        <ActivityIndicator size="large" color={colors.primary.default} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/" />;
  }

  return (
    <Stack
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: !isWeb,
        headerBackTitle: "Retour",
        headerTintColor: "#CC460F",
        headerTitleStyle: { fontWeight: "bold" },
        headerShadowVisible: false,
        contentStyle,
      }}
    >
      {children}
    </Stack>
  );
}
