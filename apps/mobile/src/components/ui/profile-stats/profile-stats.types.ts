import { User } from "@repo/shared";

export interface ProfileStatsProps {
  user: User;
  className?: string;
  onFollowsPress?: () => void;
  onHelpedPress?: () => void;
}
