import { Image, Pressable, View } from "react-native";
import clsx from "clsx";
import { cssInterop } from "nativewind";
import { Text } from "../text/text";
import { TagBadge } from "../tag-badge/tag-badge";
import { colors } from "../theme/tokens";
import { AssociationCardProps } from "./association-card.types";

import LocalisationIconSource from "@assets/icons/ic_localisation.svg";
import HandHeartIconSource from "@assets/icons/ic_hand_heart.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const LocalisationIcon = cssInterop(LocalisationIconSource, iconConfig);
const HandHeartIcon = cssInterop(HandHeartIconSource, iconConfig);

function AssociationInitials({ name }: { readonly name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <View
      className="items-center justify-center w-12 h-12 rounded-xl shrink-0"
      style={{ backgroundColor: colors.primary.active }}
    >
      <Text className="text-base font-bold text-white">{initials}</Text>
    </View>
  );
}

export function AssociationCard({
  name,
  description,
  logoUrl,
  category,
  city,
  activeMissionsCount,
  onPress,
  className,
  testID,
}: AssociationCardProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      testID={testID}
      className={clsx(
        "flex-1 flex-col bg-white border border-grey-200 rounded-2xl overflow-hidden",
        onPress && [
          "hover:border-primary hover:shadow-md",
          "active:bg-grey-50",
          "web:cursor-pointer",
          "web:outline-none",
          "web:focus-visible:ring-2 web:focus-visible:ring-focus web:focus-visible:ring-offset-2",
        ],
        className,
      )}
    >
      <View className="flex-1 p-4">
        {/* Header : logo + nom */}
        <View className="flex-row items-center gap-3 mb-3">
          {logoUrl ? (
            <Image
              source={{ uri: logoUrl }}
              style={{ width: 48, height: 48, borderRadius: 12 }}
              accessibilityLabel={`Logo de ${name}`}
            />
          ) : (
            <AssociationInitials name={name} />
          )}
          <View className="flex-1">
            <Text className="text-base font-bold text-grey-900" numberOfLines={1}>
              {name}
            </Text>
            {category && (
              <Text className="text-xs text-grey-600" numberOfLines={1}>
                {category}
              </Text>
            )}
          </View>
        </View>

        {/* Description */}
        {description && (
          <Text className="mb-3 text-sm leading-5 text-grey-600" numberOfLines={3}>
            {description}
          </Text>
        )}
      </View>

      {/* Footer */}
      <View className="px-4 py-3 border-t border-grey-100">
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          {/* Localisation */}
          {city && (
            <View className="flex-row items-center gap-1">
              <LocalisationIcon className="w-3.5 h-3.5 text-grey-500" />
              <Text className="text-xs text-grey-600">{city}</Text>
            </View>
          )}

          {/* Missions actives */}
          {activeMissionsCount > 0 && (
            <View className="flex-row items-center gap-1">
              <HandHeartIcon className="w-3.5 h-3.5 text-primary" />
              <Text className="text-xs font-semibold text-primary">
                {activeMissionsCount} mission{activeMissionsCount > 1 ? "s" : ""}
              </Text>
            </View>
          )}

          {activeMissionsCount === 0 && (
            <TagBadge label="Pas de mission active" variant="surface" size="sm" />
          )}
        </View>
      </View>
    </Pressable>
  );
}
