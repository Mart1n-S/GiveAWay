import type { MissionStatus } from "@repo/shared";

export interface MissionActionBarProps {
  readonly status: MissionStatus;
  readonly isLoading: boolean;
  readonly onEdit?: () => void;
  readonly onArchive?: () => void;
  readonly onUnarchive?: () => void;
  readonly onDelete?: () => void;
}
