import type { MissionDashboardTab } from "@repo/shared";

export interface MissionDashboardTabsProps {
  readonly activeTab: MissionDashboardTab;
  readonly counts: Record<MissionDashboardTab, number>;
  readonly onChange: (tab: MissionDashboardTab) => void;
}
