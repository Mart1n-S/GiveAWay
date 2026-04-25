import type { MissionParticipantProfile } from "@repo/shared";

export interface ParticipantProfileModalProps {
  readonly participant: MissionParticipantProfile | null;
  readonly canRemove: boolean;
  readonly onRemove: (userId: number) => void;
  readonly onClose: () => void;
}
