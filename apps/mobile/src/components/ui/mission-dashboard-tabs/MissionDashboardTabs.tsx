import React from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ui/text/text";
import type { MissionDashboardTab } from "@repo/shared";
import type { MissionDashboardTabsProps } from "./MissionDashboardTabs.types";

const TAB_LABELS: Record<MissionDashboardTab, string> = {
  active: "Actives",
  upcoming: "À venir",
  past: "Terminées",
  archived: "Archivées",
};

const TABS: MissionDashboardTab[] = ["active", "upcoming", "past", "archived"];

export function MissionDashboardTabs({
  activeTab,
  counts,
  onChange,
}: MissionDashboardTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="border-b border-grey-100 bg-white"
      contentContainerStyle={{ paddingHorizontal: 16 }}
    >
      {TABS.map((tab) => {
        const isActive = tab === activeTab;
        const count = counts[tab] ?? 0;

        return (
          <TouchableOpacity
            key={tab}
            onPress={() => onChange(tab)}
            className={`mr-4 py-3 flex-row items-center gap-1.5 border-b-2 ${
              isActive ? "border-primary" : "border-transparent"
            }`}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              className={`text-sm font-medium ${
                isActive ? "text-primary" : "text-grey-500"
              }`}
            >
              {TAB_LABELS[tab]}
            </Text>
            {count > 0 && (
              <View
                className={`rounded-full px-1.5 py-0.5 min-w-[20px] items-center ${
                  isActive ? "bg-primary" : "bg-grey-100"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isActive ? "text-white" : "text-grey-600"
                  }`}
                >
                  {count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
