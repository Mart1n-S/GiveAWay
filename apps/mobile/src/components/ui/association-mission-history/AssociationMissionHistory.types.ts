import type { MissionListItem } from "@repo/shared";

export interface AssociationMissionHistoryProps {
  missions: MissionListItem[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onViewAll: () => void;
}
