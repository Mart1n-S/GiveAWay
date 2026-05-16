import { Stack } from "expo-router";
import { ProtectedStack } from "@/components/layouts/ProtectedStack";

export default function MessagesLayout() {
  return (
    <ProtectedStack>
      <Stack.Screen
        name="index"
        options={{ headerTitle: "Messages", headerBackVisible: false }}
      />
      {/* Le bouton retour natif est géré par headerLeft custom dans [id].tsx
          (sinon, quand on push /messages/:id depuis un autre stack, le
          bouton retour natif n'apparaît pas car le stack interne est vide). */}
      <Stack.Screen
        name="[id]"
        options={{ headerTitle: "Discussion" }}
      />
    </ProtectedStack>
  );
}
