// apps/mobile/app/index.tsx
import { View, Text } from "react-native";
import { Link } from "expo-router";
import { Button } from "@repo/ui";

export default function HomeScreen() {
  return (
    <View className="items-center justify-center flex-1 gap-6 p-6">
      <Text className="text-2xl font-bold text-grey-800">
        Bienvenue sur l'App
      </Text>

      <Text className="text-center text-grey-600">
        Ceci est la page d'accueil temporaire.
      </Text>

      {/* CE BLOC N'APPARAIT QU'EN DEV (A supprimer pour la production) */}
      {__DEV__ && (
        <View className="w-full gap-4 p-4 mt-10 border border-blue-100 rounded-lg bg-blue-50">
          <Text className="mb-2 text-xs font-bold text-blue-600 uppercase">
            Zone Développeur
          </Text>

          <Link href="/design-system" asChild>
            <Button variant="secondary">Voir le Design System 📚</Button>
          </Link>
        </View>
      )}
    </View>
  );
}
