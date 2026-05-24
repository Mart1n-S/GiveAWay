import { Modal, View, ScrollView, Pressable } from "react-native";
import { cssInterop } from "nativewind";
import { Text } from "../text/text";
import { Button } from "../button/button";
import { AvatarButton } from "../avatar-button/avatar-button";
import { TagBadge } from "../tag-badge/tag-badge";
import { ProfileAvailability } from "../profile-availability/profile-availability";
import type { Skill, Cause } from "@repo/shared";
import type { ParticipantProfileModalProps } from "./participant-profile-modal.types";

import CloseIconSource from "@assets/icons/ic_close.svg";
import UsersIconSource from "@assets/icons/ic_users.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const CloseIcon = cssInterop(CloseIconSource, iconConfig);
const UsersIcon = cssInterop(UsersIconSource, iconConfig);

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

export function ParticipantProfileModal({
  participant,
  canRemove,
  onRemove,
  onClose,
}: ParticipantProfileModalProps) {
  if (!participant) return null;

  const { userId, firstName, lastName, age, profilePicture, skills, causes, availability, completedMissionsCount } =
    participant;

  return (
    <Modal
      visible={!!participant}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      supportedOrientations={["portrait", "landscape"]}
    >
      <Pressable
        className="flex-1 bg-black/50 justify-end"
        onPress={onClose}
        accessibilityViewIsModal
      >
        <Pressable
          className="bg-white rounded-t-2xl max-h-[85%]"
          onPress={(e) => e.stopPropagation()}
          accessibilityRole="none"
        >
          {/* Handle bar */}
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-grey-200" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-3 border-b border-grey-100">
            <Text className="text-lg font-bold text-grey-900">Profil du bénévole</Text>
            <Pressable
              onPress={onClose}
              className="p-1 rounded-full active:bg-grey-100"
              accessibilityLabel="Fermer"
            >
              <CloseIcon className="w-5 h-5 text-grey-600" />
            </Pressable>
          </View>

          <ScrollView
            className="px-5"
            contentContainerStyle={{ paddingBottom: 32, gap: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Avatar + identité */}
            <View className="flex-row items-center gap-4 pt-4">
              <AvatarButton
                imageUrl={profilePicture ?? undefined}
                initials={getInitials(firstName, lastName)}
                size="xl"
                readonly
              />
              <View className="flex-1 gap-1">
                <Text className="text-xl font-bold text-grey-900">
                  {firstName} {lastName}
                </Text>
                {age != null && (
                  <Text className="text-sm text-grey-500">{age} ans</Text>
                )}
                {completedMissionsCount > 0 && (
                  <View className="flex-row items-center gap-1.5 mt-1">
                    <UsersIcon className="w-4 h-4 text-badge-green-text" />
                    <Text className="text-sm text-badge-green-text font-medium">
                      {completedMissionsCount} mission{completedMissionsCount > 1 ? "s" : ""} avec votre association
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Compétences */}
            {skills.length > 0 && (
              <View className="gap-2">
                <Text className="text-sm font-semibold text-grey-800">Compétences</Text>
                <View className="flex-row flex-wrap gap-2">
                  {skills.map((s: Skill) => (
                    <TagBadge key={s.id} label={s.label} variant="blue" />
                  ))}
                </View>
              </View>
            )}

            {/* Causes */}
            {causes.length > 0 && (
              <View className="gap-2">
                <Text className="text-sm font-semibold text-grey-800">Causes</Text>
                <View className="flex-row flex-wrap gap-2">
                  {causes.map((c: Cause) => (
                    <TagBadge key={c.id} label={c.label} variant="orange" />
                  ))}
                </View>
              </View>
            )}

            {/* Disponibilités */}
            <ProfileAvailability availability={availability} />

            {/* Action retrait */}
            {canRemove && (
              <Button
                onPress={() => {
                  onClose();
                  onRemove(userId);
                }}
                className="bg-red-600 border-red-600 hover:bg-red-700 hover:border-red-700 active:bg-red-800 active:border-red-800"
              >
                Retirer de la mission
              </Button>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
