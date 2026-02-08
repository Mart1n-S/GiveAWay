import { View, Text, ScrollView } from "react-native";
import { Link } from "expo-router";
import { Button } from "@repo/ui";
import { useAuthStore } from "../src/stores/auth.store";

export default function HomeScreen() {
  const { user, isAuthenticated, logout } = useAuthStore();

  return (
    <ScrollView className="flex-1 p-6">
      <View className="items-center justify-center flex-1 gap-6">
        <Text className="text-2xl font-bold text-grey-800">
          Bienvenue sur l'App
        </Text>

        {/* Affichage des infos utilisateur */}
        {isAuthenticated && user ? (
          <View className="w-full gap-4 p-4 border rounded-lg bg-primary-50 border-primary-100">
            <Text className="mb-2 text-xs font-bold uppercase text-primary-600">
              Utilisateur connecté ✅
            </Text>

            <View className="gap-2">
              <Text className="text-sm text-grey-800">
                <Text className="font-bold">Nom :</Text> {user.firstName}{" "}
                {user.lastName}
              </Text>

              <Text className="text-sm text-grey-800">
                <Text className="font-bold">Email :</Text> {user.email}
              </Text>

              <Text className="text-sm text-grey-800">
                <Text className="font-bold">Âge :</Text> {user.age} ans
              </Text>

              <Text className="text-sm text-grey-800">
                <Text className="font-bold">Statut :</Text> {user.status}
              </Text>

              {user.address && (
                <Text className="text-sm text-grey-800">
                  <Text className="font-bold">Adresse :</Text>{" "}
                  {user.address.street}, {user.address.postalCode}{" "}
                  {user.address.city}
                </Text>
              )}

              <Text className="text-xs text-grey-600">
                Membre depuis le{" "}
                {new Date(user.createdAt).toLocaleDateString("fr-FR")}
              </Text>
            </View>

            <Button variant="secondary" onPress={logout} className="mt-2">
              Se déconnecter
            </Button>
          </View>
        ) : (
          <View className="w-full gap-4 p-4 border rounded-lg bg-grey-50 border-grey-200">
            <Text className="mb-2 text-xs font-bold uppercase text-grey-600">
              Non connecté ❌
            </Text>

            <Text className="text-sm text-center text-grey-600">
              Connectez-vous pour accéder à votre profil et vos fonctionnalités.
            </Text>

            <Link href="/connexion" asChild>
              <Button className="w-full">Se connecter</Button>
            </Link>

            <Link href="/inscription" asChild>
              <Button variant="secondary" className="w-full">
                Créer un compte
              </Button>
            </Link>
          </View>
        )}

        {/* Zone Dev */}
        {__DEV__ && (
          <View className="w-full gap-4 p-4 mt-10 border border-blue-100 rounded-lg bg-blue-50">
            <Text className="mb-2 text-xs font-bold text-blue-600 uppercase">
              Zone Développeur
            </Text>

            <Link href="/design-system" asChild>
              <Button variant="secondary">Voir le Design System 📚</Button>
            </Link>

            {/* Debug info */}
            <View className="p-2 mt-2 rounded bg-grey-100">
              <Text className="text-xs text-grey-600">
                Debug: isAuthenticated = {isAuthenticated ? "true" : "false"}
              </Text>
              <Text className="text-xs text-grey-600">
                User ID: {user?.id || "null"}
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
