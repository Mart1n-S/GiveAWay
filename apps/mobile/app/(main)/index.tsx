import { View, ScrollView } from "react-native";
import { Text } from "@/components/ui";

export default function HomeScreen() {
  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <View className="items-center justify-center flex-1 p-6">
        <Text className="text-2xl font-bold text-center text-grey-900">
          Bienvenue sur l'accueil de GiveAWay 🥸
        </Text>
      </View>
    </ScrollView>
  );
}
