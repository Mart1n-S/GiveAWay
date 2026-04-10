import { View, TextInput, Platform, ViewStyle } from "react-native";
import clsx from "clsx";
import { cssInterop } from "nativewind";
import { Text } from "../text/text";
import { Pressable } from "react-native";
import { colors } from "../theme/tokens";
import { MissionFiltersProps } from "./mission-filters.types";
import { ActivityType } from "@repo/shared";

import SearchIconSource from "@assets/icons/ic_search.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const SearchIcon = cssInterop(SearchIconSource, iconConfig);

const typeFilters: { value: ActivityType | null; label: string }[] = [
  { value: null, label: "Tous" },
  { value: "MISSION", label: "Missions" },
  { value: "EVENT", label: "Événements" },
  { value: "COLLECT", label: "Collectes" },
  { value: "INFO", label: "Infos" },
];

const isWeb = Platform.OS === "web";

/**
 * Barre de filtres pour la page d'activités.
 * Contient un champ de recherche et des filtres par type d'activité.
 */
export function MissionFilters({
  selectedType,
  onTypeChange,
  searchText,
  onSearchChange,
  className,
}: MissionFiltersProps) {
  const webStyle = Platform.select({
    web: { outlineStyle: "none" },
    default: {},
  }) as ViewStyle;

  return (
    <View className={clsx("gap-4", className)}>
      {/* Barre de recherche */}
      <View
        className={clsx(
          "h-control flex-row items-center rounded-md border border-grey-600 px-3 gap-2 bg-white",
          isWeb && "transition-all hover:border-primary",
          isWeb && "focus-within:border-primary focus-within:ring-2 focus-within:ring-focus focus-within:ring-offset-2",
        )}
      >
        <SearchIcon className="w-5 h-5 text-grey-400" />
        <TextInput
          value={searchText}
          onChangeText={onSearchChange}
          placeholder="Rechercher une mission, une association..."
          placeholderTextColor={colors.grey[700]}
          style={webStyle}
          className={clsx(
            "flex-1 h-full bg-transparent p-0 border-0 text-base font-sans text-grey-900",
            isWeb && "outline-none",
          )}
        />
      </View>

      {/* Filtres par type */}
      <View className="flex-row flex-wrap gap-2">
        {typeFilters.map((filter) => {
          const isActive = selectedType === filter.value;

          return (
            <Pressable
              key={filter.label}
              onPress={() => onTypeChange(filter.value)}
              className={clsx(
                "px-4 py-2 rounded-lg border",
                isWeb && "web:cursor-pointer web:outline-none",
                isWeb &&
                  "web:focus-visible:ring-2 web:focus-visible:ring-focus web:focus-visible:ring-offset-2",
                isActive
                  ? "bg-primary border-primary"
                  : [
                      "bg-white border-grey-200",
                      "hover:border-primary hover:bg-white-hover",
                      "active:bg-white-active",
                    ],
              )}
            >
              <Text
                className={clsx(
                  "text-sm font-semibold",
                  isActive ? "text-white" : "text-grey-700",
                )}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
