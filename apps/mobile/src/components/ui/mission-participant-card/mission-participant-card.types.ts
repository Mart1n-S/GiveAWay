import type { MissionParticipantProfile } from "@repo/shared";

export interface MissionParticipantCardProps {
  readonly participant: MissionParticipantProfile;
  readonly canRemove: boolean;
  readonly onRemove: (userId: number) => void;
  readonly onViewProfile: (participant: MissionParticipantProfile) => void;
}
