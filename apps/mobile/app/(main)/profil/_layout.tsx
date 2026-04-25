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
      <Stack.Screen name="abonnements" options={{ headerTitle: "Abonnements" }} />
      <Stack.Screen name="associations-aidees" options={{ headerTitle: "Associations aidées" }} />
      <Stack.Screen name="historique" options={{ headerTitle: "Mes missions" }} />
    </ProtectedStack>
  );
}
