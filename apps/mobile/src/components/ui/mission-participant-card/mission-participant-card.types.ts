import type { MissionParticipantProfile } from "@repo/shared";

export interface MissionParticipantCardProps {
  participant: MissionParticipantProfile;
  canRemove: boolean;
  onRemove: (userId: number) => void;
  onViewProfile: (participant: MissionParticipantProfile) => void;
}
