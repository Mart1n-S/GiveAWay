import { View } from "react-native";
import clsx from "clsx";
import { Text } from "../text/text";
import { AvatarButton } from "../avatar-button/avatar-button";
import { ProfileHeaderProps } from "./profile-header.types";

/**
 * En-tête de la page profil.
 *
 * Affiche :
 * - L'avatar de l'utilisateur (photo ou initiales)
 * - Le nom complet
 * - La ville (si adresse disponible)
 * - La date d'inscription
 *
 * @example
 * <ProfileHeader user={user} />
 */
export function ProfileHeader({ user, className }: ProfileHeaderProps) {
  const initials = `${user.firstName[0]}${user.lastName[0]}`;

  const memberSince = new Date(user.createdAt).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  return (
    <View className={clsx("items-center pt-4", className)}>
      {/* Avatar */}
      <AvatarButton
        size="xl"
        imageUrl={user.profilePicture}
        initials={initials}
        readonly
        className="border-4 border-white shadow-sm"
      />

      {/* Infos */}
      <View className="items-center w-full gap-1 px-4 mt-3">
        <Text
          className="w-full text-2xl font-bold tracking-tight text-center text-grey-900"
          testID="profile-fullname"
          numberOfLines={0}
        >
          {user.firstName} {user.lastName}
        </Text>

        {user.address?.city && (
          <Text className="text-sm text-grey-600">📍 {user.address.city}</Text>
        )}

        <Text className="mt-1 text-xs font-medium tracking-wider uppercase text-grey-600">
          Membre depuis {memberSince}
        </Text>
      </View>
    </View>
  );
}
