import type { AssociationMissionItem } from "@repo/shared";

export type MissionQuickAction = "edit" | "archive" | "unarchive" | "delete";

export interface MissionDashboardCardProps {
  readonly mission: AssociationMissionItem;
  readonly onPress: () => void;
  readonly onQuickAction?: (action: MissionQuickAction) => void;
}
