import React from "react";
import { View } from "react-native";
import { cssInterop } from "nativewind";
import { Text } from "@/components/ui/text/text";
import { Button } from "@/components/ui/button/button";
import type { MissionDashboardTab } from "@repo/shared";

import HandHeartIconSource from "@assets/icons/ic_hand_heart.svg";
import CalendarIconSource from "@assets/icons/ic_calendar.svg";
import CheckIconSource from "@assets/icons/ic_check_small.svg";
import BoxIconSource from "@assets/icons/ic_box.svg";
import AddIconSource from "@assets/icons/ic_add.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const HandHeartIcon = cssInterop(HandHeartIconSource, iconConfig);
const CalendarIcon = cssInterop(CalendarIconSource, iconConfig);
const CheckIcon = cssInterop(CheckIconSource, iconConfig);
const BoxIcon = cssInterop(BoxIconSource, iconConfig);
const AddIcon = cssInterop(AddIconSource, iconConfig);

type IconComponent = React.ComponentType<{ className?: string }>;

const EMPTY_CONFIG: Record<
  MissionDashboardTab,
  { Icon: IconComponent; message: string; hasCta: boolean }
> = {
  active: {
    Icon: HandHeartIcon,
    message: "Aucune mission active pour le moment.",
    hasCta: true,
  },
  upcoming: {
    Icon: CalendarIcon,
    message: "Aucune mission à venir.",
    hasCta: false,
  },
  past: {
    Icon: CheckIcon,
    message: "Aucune mission terminée.",
    hasCta: false,
  },
  archived: {
    Icon: BoxIcon,
    message: "Aucune mission archivée.",
    hasCta: false,
  },
};

interface MissionEmptyStateProps {
  readonly tab: MissionDashboardTab;
  readonly onCreatePress?: () => void;
}

export function MissionEmptyState({ tab, onCreatePress }: MissionEmptyStateProps) {
  const config = EMPTY_CONFIG[tab];
  const Icon = config.Icon;

  return (
    <View className="items-center justify-center py-16 px-8 gap-4">
      <View className="w-16 h-16 rounded-full bg-grey-100 items-center justify-center">
        <Icon className="w-8 h-8 text-grey-400" />
      </View>
      <Text className="text-base text-grey-500 text-center">{config.message}</Text>
      {config.hasCta && !!onCreatePress && (
        <Button
          onPress={onCreatePress}
          className="mt-2"
          icon={<AddIcon className="w-4 h-4 text-white" />}
        >
          Créer une mission
        </Button>
      )}
    </View>
  );
}
