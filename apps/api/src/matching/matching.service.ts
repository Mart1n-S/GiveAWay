import { Injectable } from '@nestjs/common';

export const MATCH_THRESHOLD = 40;
const DISTANCE_MAX_KM = 50;
const DISTANCE_FULL_KM = 5;

export interface MissionForScoring {
  causes: { cause: { id: number } }[];
  skills: { skill: { id: number } }[];
  availabilityType: string | null;
  address: { latitude: unknown; longitude: unknown } | null;
  startDate: Date | null;
}

export interface UserForScoring {
  causes: { cause: { id: number } }[];
  skills: { skill: { id: number } }[];
  availability: { type: string; timeSlot: string[] } | null;
  address: { latitude: unknown; longitude: unknown } | null;
  participations: {
    mission: {
      causes: { cause: { id: number } }[];
      skills: { skill: { id: number } }[];
    };
  }[];
}

export interface MatchScore {
  total: number;
  breakdown: {
    causes: number;
    skills: number;
    availability: number;
    distance: number;
    history: number;
  };
  isMatch: boolean;
}

@Injectable()
export class MatchingService {
  scoreUserMission(
    user: UserForScoring,
    mission: MissionForScoring,
  ): MatchScore {
    const causes = this.scoreCauses(user, mission);
    const skills = this.scoreSkills(user, mission);
    const availability = this.scoreAvailability(user, mission);
    const distance = this.scoreDistance(user, mission);
    const history = this.scoreHistory(user, mission);

    const total = causes + skills + availability + distance + history;

    return {
      total,
      breakdown: { causes, skills, availability, distance, history },
      isMatch: total >= MATCH_THRESHOLD,
    };
  }

  private scoreCauses(
    user: UserForScoring,
    mission: MissionForScoring,
  ): number {
    if (mission.causes.length === 0 || user.causes.length === 0) return 0;
    const missionIds = new Set(mission.causes.map((c) => c.cause.id));
    const overlap = user.causes.filter((c) =>
      missionIds.has(c.cause.id),
    ).length;
    return Math.round((overlap / mission.causes.length) * 30);
  }

  private scoreSkills(
    user: UserForScoring,
    mission: MissionForScoring,
  ): number {
    if (mission.skills.length === 0 || user.skills.length === 0) return 0;
    const missionIds = new Set(mission.skills.map((s) => s.skill.id));
    const overlap = user.skills.filter((s) =>
      missionIds.has(s.skill.id),
    ).length;
    return Math.round((overlap / mission.skills.length) * 25);
  }

  private scoreAvailability(
    user: UserForScoring,
    mission: MissionForScoring,
  ): number {
    if (!user.availability) return 0;

    let score = 0;

    // Type compatibility (10 pts)
    const missionType = mission.availabilityType;
    const userType = user.availability.type;
    if (
      !missionType ||
      userType === 'HYBRID' ||
      missionType === 'REMOTE' ||
      userType === missionType
    ) {
      score += 10;
    }

    // Time slot compatibility (10 pts)
    const timeSlots = user.availability.timeSlot;
    if (!mission.startDate || timeSlots.includes('ALL_TIME')) {
      score += 10;
    } else {
      const day = mission.startDate.getDay();
      const hour = mission.startDate.getHours();
      const isWeekend = day === 0 || day === 6;
      const isEvening = hour >= 17;

      if (
        (isWeekend && timeSlots.includes('WEEKEND')) ||
        (!isWeekend && timeSlots.includes('WEEKDAY')) ||
        (isEvening && timeSlots.includes('EVENING'))
      ) {
        score += 10;
      }
    }

    return score;
  }

  private scoreDistance(
    user: UserForScoring,
    mission: MissionForScoring,
  ): number {
    // Remote mission = full score regardless of location
    if (mission.availabilityType === 'REMOTE') return 15;

    // No coordinates = neutral (does not penalize)
    const uLat = Number(user.address?.latitude);
    const uLng = Number(user.address?.longitude);
    const mLat = Number(mission.address?.latitude);
    const mLng = Number(mission.address?.longitude);

    if (!uLat || !uLng || !mLat || !mLng) return 0;

    const km = this.haversineKm(uLat, uLng, mLat, mLng);

    if (km <= DISTANCE_FULL_KM) return 15;
    if (km >= DISTANCE_MAX_KM) return 0;
    return Math.round(
      15 * (1 - (km - DISTANCE_FULL_KM) / (DISTANCE_MAX_KM - DISTANCE_FULL_KM)),
    );
  }

  private scoreHistory(
    user: UserForScoring,
    mission: MissionForScoring,
  ): number {
    if (user.participations.length === 0) return 0;
    if (mission.causes.length === 0 && mission.skills.length === 0) return 0;

    const missionCauseIds = new Set(mission.causes.map((c) => c.cause.id));
    const missionSkillIds = new Set(mission.skills.map((s) => s.skill.id));

    const hasOverlap = user.participations.some(
      (p) =>
        p.mission.causes.some((c) => missionCauseIds.has(c.cause.id)) ||
        p.mission.skills.some((s) => missionSkillIds.has(s.skill.id)),
    );

    return hasOverlap ? 10 : 0;
  }

  private haversineKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}
