import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function AssociationsLayout() {
  const isWeb = Platform.OS === "web";

  return (
    <Stack
      screenOptions={{
        headerShown: !isWeb,
        headerBackTitle: "Retour",
        headerTintColor: "#CC460F",
        headerTitleStyle: { fontWeight: "bold" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: "#ffffff" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Associations" }} />
    </Stack>
  );
}
