import { View } from "react-native";
import clsx from "clsx";
import { cssInterop } from "nativewind";
import { Text } from "../text/text";
import { ProfileBioCardProps } from "./profile-bio-card.types";

import EmailIconSource from "@assets/icons/ic_email.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const EmailIcon = cssInterop(EmailIconSource, iconConfig);

/**
 * Carte affichant la biographie et l'email de l'utilisateur.
 *
 * - La biographie est masquée si absente
 * - L'email est toujours affiché
 *
 * @example
 * <ProfileBioCard user={user} />
 */
export function ProfileBioCard({ user, className }: ProfileBioCardProps) {
  return (
    <View
      className={clsx(
        "p-5 rounded-lg bg-white border border-grey-100 gap-4",
        className,
      )}
    >
      {!!user.biography && (
        <View className="gap-1">
          <Text className="text-[10px] font-bold uppercase tracking-widest text-grey-900">
            Biographie
          </Text>
          <Text className="mt-1 text-sm leading-relaxed text-grey-600">
            {user.biography}
          </Text>
        </View>
      )}

      {/* Email */}
      <View className="gap-1">
        <Text className="text-[10px] font-bold uppercase tracking-widest text-grey-900">
          Email
        </Text>
        <View className="flex-row items-center gap-2 p-3 mt-1 border rounded-lg bg-grey-50 border-grey-100">
          <EmailIcon className="w-4 h-4 text-grey-500" />
          <Text className="text-sm font-medium text-grey-700">
            {user.email || "Non renseigné"}
          </Text>
        </View>
      </View>
    </View>
  );
}