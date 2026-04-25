import { User } from "@repo/shared";

export interface ProfileStatsProps {
  readonly user: User;
  readonly className?: string;
  readonly onFollowsPress?: () => void;
  readonly onHelpedPress?: () => void;
}
