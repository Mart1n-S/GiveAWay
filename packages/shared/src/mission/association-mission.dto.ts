import { Address } from "../address/address.dto";
import { Skill } from "../skill/skill.dto";
import { Cause } from "../cause/cause.dto";
import {
  MissionBase,
  MissionStatus,
  MissionFrequency,
  MissionDashboardTab,
} from "./mission.enums";

/**
 * Représentation complète d'une mission dans le tableau de bord association.
 * `availabilityType` est héritée de MissionBase
 */
export interface AssociationMissionItem extends MissionBase {
  status: MissionStatus;
  hasRegistration: boolean;
  volunteersNeeded: number | null;
  durationInt: number | null;
  frequency: MissionFrequency | null;
  startDate: Date | string | null;
  endDate: Date | string | null;
  participantsCount: number;
  address: Address | null;
  causes: Cause[];
  skills: Skill[];
  volunteerTypes: { id: number; label: string }[];
  publicTypes: { id: number; label: string }[];
  createdAt: Date | string;
  updatedAt: Date | string;
  /** Alertes non bloquantes — présentes uniquement sur les réponses de modification */
  warnings?: string[];
}

/** Réponse du tableau de bord — missions classées par onglet + counts */
export interface AssociationMissionDashboard {
  missions: Record<MissionDashboardTab, AssociationMissionItem[]>;
  counts: Record<MissionDashboardTab, number>;
}
