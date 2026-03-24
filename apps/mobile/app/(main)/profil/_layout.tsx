import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function ProfileLayout() {
  const isWeb = Platform.OS === "web";

  return (
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
      <Stack.Screen
        name="index"
        options={{
          title: "Mon Profil",
        }}
      />
      <Stack.Screen
        name="modifier"
        options={{
          title: "Modifier mon Profil",
        }}
      />
      <Stack.Screen
        name="supprimer"
        options={{ headerTitle: "Supprimer le compte" }}
      />
      {/* TODO: Futures pages comme name="modifier" 
         hériteront automatiquement de ce style.
      */}
    </Stack>
  );
}
