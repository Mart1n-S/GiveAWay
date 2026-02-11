import React from "react";
import { View, Text, ScrollView } from "react-native";
import { Stack, useRouter } from "expo-router";
import { cssInterop } from "nativewind";
import { SelectionCard } from "@/components/ui";

import UserIconSource from "@assets/icons/ic_user.svg";
import BuildingIconSource from "@assets/icons/ic_building.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const UserIcon = cssInterop(UserIconSource, iconConfig);
const BuildingIcon = cssInterop(BuildingIconSource, iconConfig);

export default function RegisterChoiceScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: "Inscription",
          headerBackTitle: "Retour",
        }}
      />

      <ScrollView
        className="flex-1 bg-gray-50"
        contentContainerStyle={{ flexGrow: 1, padding: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-5xl mx-auto">
          {/* --- EN-TÊTE DE LA PAGE --- */}
          <View className="items-center mb-8 md:items-start">
            <Text className="mb-2 text-2xl font-bold text-center text-grey-900 md:text-left">
              Bienvenue sur GiveAWay 👋
            </Text>
            <Text className="text-base text-center text-grey-600 md:text-left">
              Choisissez votre profil pour commencer votre aventure solidaire
            </Text>
          </View>

          <View className="flex-col gap-6 md:flex-row">
            {/* --- CARTE PARTICULIER --- */}
            <SelectionCard
              className="flex-1 h-full"
              title="Je suis un particulier"
              description="Vous souhaitez vous engager, donner de votre temps ou faire des dons ? Trouvez des missions qui correspondent à vos valeurs."
              icon={<UserIcon className="w-8 h-8 text-primary" />}
              features={[
                "Découvrez des missions près de chez vous",
                "Choisissez vos causes préférées",
                "Gérez votre temps selon vos disponibilités",
              ]}
              actionLabel="Créer mon compte"
              onPress={() => router.push("/(auth)/inscription/particulier")}
            />

            {/* --- CARTE ASSOCIATION --- */}
            <SelectionCard
              className="flex-1 h-full"
              title="Je suis une association"
              description="Vous recherchez des bénévoles, des compétences ou des dons ? Publiez vos missions et trouvez des volontaires engagés."
              badgeText="Espace Association"
              icon={<BuildingIcon className="w-8 h-8 text-primary" />}
              features={[
                "Publiez vos missions gratuitement",
                "Gérez vos bénévoles facilement",
                "Atteignez une communauté engagée",
              ]}
              actionLabel="Inscrire mon association"
              onPress={() => router.push("/(auth)/inscription/association")}
            />
          </View>
        </View>
      </ScrollView>
    </>
  );
}
