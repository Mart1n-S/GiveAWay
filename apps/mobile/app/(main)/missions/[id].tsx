import { useState, useEffect } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { MissionDetail } from "@repo/shared";
import { MissionService } from "@/services/mission.service";
import { Text, colors } from "@/components/ui";
import { MissionDetailHeader } from "@/components/ui/mission-detail/mission-detail-header";
import { MissionDetailContent } from "@/components/ui/mission-detail/mission-detail-content";
import { MissionDetailSidebar } from "@/components/ui/mission-detail/mission-detail-sidebar";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function MissionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [mission, setMission] = useState<MissionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  usePageTitle("Détail mission");

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    MissionService.getMissionById(Number(id))
      .then(setMission)
      .catch(() => setError("Impossible de charger cette mission."))
      .finally(() => setIsLoading(false));
  }, [id]);

  // Retour intelligent : historique si possible, sinon listing
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push("/missions");
    }
  };

  // --- Chargement ---
  if (isLoading) {
    return (
      <View className="items-center justify-center flex-1 bg-white">
        <ActivityIndicator size="large" color={colors.primary.default} />
      </View>
    );
  }

  // --- Erreur ---
  if (error || !mission) {
    return (
      <View className="items-center justify-center flex-1 px-6 bg-white">
        <Text className="text-base text-center text-red-600">
          {error ?? "Mission introuvable."}
        </Text>
      </View>
    );
  }

  return (
    <>
      {/* Titre dynamique dans le header natif mobile */}
      <Stack.Screen options={{ title: mission.title }} />

      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="w-full max-w-4xl px-4 py-6 mx-auto md:px-8 md:py-10">

          {/* En-tête : bouton retour (web) + badge type + titre */}
          <MissionDetailHeader
            title={mission.title}
            type={mission.type}
            onBack={handleBack}
          />

          {/* Nom de l'association */}
          <Text className="mb-6 text-base text-grey-600">
            par{" "}
            <Text className="font-semibold text-grey-800">
              {mission.association.name}
            </Text>
          </Text>

          {/* Mise en page : sidebar à gauche + contenu à droite (desktop) */}
          <View className="flex-col md:flex-row md:gap-8">
            {/* Sidebar : métadonnées, CTA, bloc association */}
            <View className="mb-8 md:w-80 md:flex-shrink-0 md:mb-0">
              <MissionDetailSidebar
                association={mission.association}
                city={mission.address?.city ?? null}
                street={mission.address?.street ?? null}
                durationInt={mission.durationInt}
                frequency={mission.frequency}
                startDate={mission.startDate}
                endDate={mission.endDate}
                participantsCount={mission.participantsCount}
                volunteersNeeded={mission.volunteersNeeded}
                hasRegistration={mission.hasRegistration}
              />
            </View>

            {/* Contenu principal : description, causes, skills, publics */}
            <View className="flex-1">
              <MissionDetailContent
                description={mission.description}
                causes={mission.causes}
                skills={mission.skills}
                publicTypes={mission.publicTypes}
                volunteerTypes={mission.volunteerTypes}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
