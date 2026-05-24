import { View, Pressable } from "react-native";
import { cssInterop } from "nativewind";
import { Text } from "../text/text";
import { Button } from "../button/button";
import { AvatarButton } from "../avatar-button/avatar-button";
import { TagBadge } from "../tag-badge/tag-badge";
import { MissionParticipantCardProps } from "./mission-participant-card.types";

import UserIconSource from "@assets/icons/ic_users.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const UserIcon = cssInterop(UserIconSource, iconConfig);

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

export function MissionParticipantCard({
  participant,
  canRemove,
  onRemove,
  onViewProfile,
}: MissionParticipantCardProps) {
  const { userId, firstName, lastName, age, profilePicture, skills, causes, completedMissionsCount } =
    participant;

  return (
    <View className="bg-white rounded-xl border border-grey-100 p-4 gap-3">
      {/* Header : avatar + nom + âge */}
      <Pressable
        onPress={() => onViewProfile(participant)}
        className="flex-row items-center gap-3 active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel={`Voir le profil de ${firstName} ${lastName}`}
      >
        <AvatarButton
          imageUrl={profilePicture ?? undefined}
          initials={getInitials(firstName, lastName)}
          size="lg"
          readonly
        />
        <View className="flex-1">
          <Text className="text-base font-semibold text-grey-900">
            {firstName} {lastName}
          </Text>
          {age != null && (
            <Text className="text-sm text-grey-500">{age} ans</Text>
          )}
        </View>
        {completedMissionsCount > 0 && (
          <View className="flex-row items-center gap-1 bg-badge-green-bg rounded-full px-2 py-1">
            <UserIcon className="w-3 h-3 text-badge-green-text" />
            <Text className="text-xs text-badge-green-text font-medium">
              {completedMissionsCount} mission{completedMissionsCount > 1 ? "s" : ""}
            </Text>
          </View>
        )}
      </Pressable>

      {/* Tags compétences */}
      {skills.length > 0 && (
        <View className="flex-row flex-wrap gap-1.5">
          {skills.slice(0, 4).map((s) => (
            <TagBadge key={s.id} label={s.label} variant="blue" size="sm" />
          ))}
          {skills.length > 4 && (
            <TagBadge label={`+${skills.length - 4}`} variant="surface" size="sm" />
          )}
        </View>
      )}

      {/* Tags causes */}
      {causes.length > 0 && (
        <View className="flex-row flex-wrap gap-1.5">
          {causes.slice(0, 3).map((c) => (
            <TagBadge key={c.id} label={c.label} variant="orange" size="sm" />
          ))}
          {causes.length > 3 && (
            <TagBadge label={`+${causes.length - 3}`} variant="surface" size="sm" />
          )}
        </View>
      )}

      {/* Actions */}
      <View className="flex-row gap-2 pt-1">
        <Button
          variant="secondary"
          onPress={() => onViewProfile(participant)}
          className="flex-1"
        >
          Voir le profil
        </Button>
        {canRemove && (
          <Button
            onPress={() => onRemove(userId)}
            className="flex-1 bg-red-600 border-red-600 hover:bg-red-700 hover:border-red-700 active:bg-red-800 active:border-red-800"
          >
            Retirer
          </Button>
        )}
      </View>
    </View>
  );
}
