import { Stack } from "expo-router";
import { ProtectedStack } from "@/components/layouts/ProtectedStack";

export default function MissionsLayout() {
  return (
    <ProtectedStack>
      <Stack.Screen name="index" options={{ title: "Mes missions" }} />
      <Stack.Screen name="creer" options={{ title: "Créer une mission" }} />
      <Stack.Screen name="[missionId]/index" options={{ title: "Mission" }} />
      <Stack.Screen name="[missionId]/modifier" options={{ title: "Modifier la mission" }} />
    </ProtectedStack>
  );
}
