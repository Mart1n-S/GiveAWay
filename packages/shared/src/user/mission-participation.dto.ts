export interface MissionParticipation {
  missionId: number;
  createdAt: Date | string;
  mission: {
    id: number;
    title: string;
    type: string;
    availabilityType: string;
    startDate: Date | string | null;
    durationInt: number | null;
    causes: { id: number; label: string }[];
    association: {
      id: number;
      name: string;
    };
  };
}
