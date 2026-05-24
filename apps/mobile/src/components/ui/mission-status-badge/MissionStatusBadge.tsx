import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text/text";
import type { MissionStatus } from "@repo/shared";

const STATUS_CONFIG: Record<
  MissionStatus,
  { bg: string; text: string; label: string }
> = {
  ACTIVE: { bg: "bg-green-100", text: "text-green-700", label: "Active" },
  ARCHIVED: { bg: "bg-blue-100", text: "text-blue-700", label: "Archivée" },
  DELETED: { bg: "bg-red-100", text: "text-red-700", label: "Supprimée" },
};

interface MissionStatusBadgeProps {
  readonly status: MissionStatus;
  readonly size?: "sm" | "md";
}

export function MissionStatusBadge({
  status,
  size = "md",
}: MissionStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <View className={`self-start rounded-full px-2 py-0.5 ${config.bg}`}>
      <Text
        className={`font-medium ${config.text} ${size === "sm" ? "text-xs" : "text-sm"}`}
      >
        {config.label}
      </Text>
    </View>
  );
}
