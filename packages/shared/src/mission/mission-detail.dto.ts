import { Address } from "../address/address.dto";
import { Skill } from "../skill/skill.dto";
import { Cause } from "../cause/cause.dto";
import {
  MissionBase,
  MissionFrequency,
  MissionStatus,
} from "./mission.enums";

/** Détail complet d'une mission (page individuelle) */
export interface MissionDetail extends MissionBase {
  status: MissionStatus;
  hasRegistration: boolean;
  volunteersNeeded: number | null;
  durationInt: number | null;
  frequency: MissionFrequency | null;
  startDate: Date | string | null;
  endDate: Date | string | null;
  participantsCount: number;
  isParticipating?: boolean;

  association: {
    id: number;
    name: string;
    logoUrl: string | null;
    description: string | null;
    website: string | null;
  };

  address: Address | null;
  causes: Cause[];
  skills: Skill[];
  volunteerTypes: { id: number; label: string }[];
  publicTypes: { id: number; label: string }[];
}
