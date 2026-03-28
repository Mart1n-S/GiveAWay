import { View, Pressable } from "react-native";
import clsx from "clsx";
import { Text } from "../text/text";
import { MissionHistoryItem } from "../mission-history-item/mission-history-item";
import { ProfileHistoryProps } from "./profile-history.types";

/**
 * Section historique des actions du profil bénévole.
 *
 * Affiche les 5 dernières participations aux missions.
 * Chaque item est cliquable pour naviguer vers le détail de la mission.
 * Un lien "Voir tout" est affiché si des participations existent.
 *
 * Si aucune participation n'est enregistrée,
 * un message d'invitation est affiché.
 *
 * @example
 * <ProfileHistory
 *   user={user}
 *   onMissionPress={(id) => router.push(`/missions/${id}`)}
 *   onSeeAllPress={() => router.push('/missions/historique')}
 * />
 */
export function ProfileHistory({
  user,
  onMissionPress,
  onSeeAllPress,
  className,
}: ProfileHistoryProps) {
  const hasParticipations =
    user.participations && user.participations.length > 0;

  return (
    <View className={clsx("gap-4", className)}>
      {/* En-tête */}
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-bold text-grey-900">
          Historique des actions
        </Text>
        {hasParticipations && onSeeAllPress && (
          <Pressable
            onPress={onSeeAllPress}
            className="active:opacity-60 web:cursor-pointer"
          >
            <Text className="text-xs font-bold text-primary">Voir tout</Text>
          </Pressable>
        )}
      </View>

      {/* Liste */}
      {hasParticipations ? (
        <View className="gap-3">
          {user.participations!.map((participation) => (
            <MissionHistoryItem
              key={participation.missionId}
              title={participation.mission.title}
              associationName={participation.mission.association.name}
              date={participation.createdAt}
              type={
                participation.mission.type as
                  | "MISSION"
                  | "EVENT"
                  | "COLLECT"
                  | "INFO"
              }
              onPress={
                onMissionPress
                  ? () => onMissionPress(participation.missionId)
                  : undefined
              }
            />
          ))}
        </View>
      ) : (
        <View className="items-center gap-2 p-5 bg-white border rounded-lg border-grey-100">
          <Text className="text-sm font-medium text-grey-600">
            Aucune mission effectuée pour le moment.
          </Text>
          <Text className="text-xs text-center text-grey-600">
            Explorez les missions disponibles et commencez à vous engager !
          </Text>
        </View>
      )}
    </View>
  );
}
