export interface MissionParticipation {
  missionId: number;
  createdAt: Date | string;
  mission: {
    id: number;
    title: string;
    type: string;
    startDate: Date | string | null;
    association: {
      id: number;
      name: string;
    };
  };
}
