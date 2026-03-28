import { User } from "@repo/shared";

export interface ProfileHistoryProps {
  user: User;
  onMissionPress?: (missionId: number) => void;
  onSeeAllPress?: () => void;
  className?: string;
}
