import { ScrollView, View, Pressable } from "react-native";
import type { ActivityType } from "@repo/shared";
import { ACTIVITY_TYPES } from "@repo/shared";
import { Text } from "../text/text";
import { colors } from "../theme/tokens";

export const TYPE_LABELS: Record<ActivityType, string> = {
  MISSION: "Mission",
  EVENT: "Événement",
  COLLECT: "Collecte",
  INFO: "Information",
};

export const TYPE_COLORS: Record<ActivityType, string> = {
  MISSION: colors.primary.default,
  EVENT: colors.blue[600],
  COLLECT: colors.green[600],
  INFO: colors.grey[500],
};

interface TypeFilterBarProps {
  readonly selected: ActivityType | undefined;
  readonly onSelect: (t: ActivityType | undefined) => void;
}

export function TypeFilterBar({ selected, onSelect }: TypeFilterBarProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View className="flex-row gap-2">
        <Pressable
          testID="filter-type-ALL"
          onPress={() => onSelect(undefined)}
          className="px-3 py-1.5 rounded-full border web:cursor-pointer"
          style={{
            backgroundColor: !selected ? colors.primary.default : "white",
            borderColor: !selected ? colors.primary.default : colors.grey[200],
          }}
        >
          <Text
            className="text-xs font-semibold"
            style={{ color: !selected ? "white" : colors.grey[600] }}
          >
            Tous
          </Text>
        </Pressable>

        {ACTIVITY_TYPES.map((type) => {
          const active = selected === type;
          return (
            <Pressable
              key={type}
              testID={`filter-type-${type}`}
              onPress={() => onSelect(active ? undefined : type)}
              className="px-3 py-1.5 rounded-full border web:cursor-pointer"
              style={{
                backgroundColor: active ? TYPE_COLORS[type] : "white",
                borderColor: active ? TYPE_COLORS[type] : colors.grey[200],
              }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: active ? "white" : colors.grey[600] }}
              >
                {TYPE_LABELS[type]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
