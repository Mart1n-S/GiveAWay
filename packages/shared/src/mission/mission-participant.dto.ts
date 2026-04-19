import { Skill } from "../skill/skill.dto";
import { Cause } from "../cause/cause.dto";
import { UserAvailability } from "../user/user-availability.dto";

export interface MissionParticipantProfile {
  userId: number;
  firstName: string;
  lastName: string;
  age: number | null;
  profilePicture: string | null;
  skills: Skill[];
  causes: Cause[];
  availability: UserAvailability | null;
  /** Nombre de missions passées réalisées avec cette association */
  completedMissionsCount: number;
  joinedAt: Date | string;
}

export interface MissionParticipantsResponse {
  participants: MissionParticipantProfile[];
  total: number;
  /** Faux si la mission est archivée ou terminée — le retrait est désactivé */
  canRemove: boolean;
}
