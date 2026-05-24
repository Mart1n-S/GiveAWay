import { Stack } from "expo-router";
import { ProtectedStack } from "@/components/layouts/ProtectedStack";

export default function AssociationLayout() {
  return (
    <ProtectedStack>
      <Stack.Screen name="index" options={{ title: "Mon Association" }} />
      <Stack.Screen name="modifier" options={{ title: "Modifier l'association" }} />
      <Stack.Screen name="membres" options={{ title: "Membres" }} />
      <Stack.Screen name="missions" options={{ headerShown: false }} />
    </ProtectedStack>
  );
}
