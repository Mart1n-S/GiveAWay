import { Stack } from "expo-router";
import { View, ScrollView, Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { Button, Text } from "@/components/ui";
// TODO: Supprimer pour la production
export default function DevNotificationsScreen() {
  const sendTestNotification = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "GiveAWay — Test 🎉",
        body: "Les notifications push fonctionnent correctement !",
        data: { test: true },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3,
      },
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerTitle: "Notifications 🔔" }} />

      <ScrollView
        className="flex-1 bg-grey-50"
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: "center",
          paddingVertical: 24,
        }}
      >
        <View className="w-full max-w-2xl gap-6 px-4">
          <View className="gap-3 p-4 bg-white border rounded-lg border-grey-100">
            <Text className="text-base font-bold text-grey-900">
              Push locale uniquement pour le mobile sur le web non
            </Text>
            <Text className="text-sm text-grey-500">
              Envoie une notification locale dans 3 secondes. Minimise
              l'application pour la voir apparaître en bannière.
            </Text>
            {Platform.OS !== "web" && (
              <Button onPress={sendTestNotification}>
                Envoyer une notification test
              </Button>
            )}
          </View>
        </View>
      </ScrollView>
    </>
  );
}
