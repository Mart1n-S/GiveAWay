import { Stack } from "expo-router";
import { ProtectedStack } from "@/components/layouts/ProtectedStack";

export default function ProfileLayout() {
  return (
    <ProtectedStack>
      <Stack.Screen name="index" options={{ title: "Mon Profil" }} />
      <Stack.Screen name="modifier" options={{ title: "Modifier mon Profil" }} />
      <Stack.Screen name="supprimer" options={{ headerTitle: "Supprimer le compte" }} />
      <Stack.Screen name="mot-de-passe" options={{ headerTitle: "Mot de passe et sécurité" }} />
      <Stack.Screen name="notifications" options={{ headerTitle: "Notifications" }} />
    </ProtectedStack>
  );
}
