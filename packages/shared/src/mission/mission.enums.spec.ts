import {
  ACTIVITY_TYPES,
  MISSION_FREQUENCIES,
  MISSION_STATUSES,
  MISSION_AVAILABILITY_TYPES,
  type ActivityType,
  type MissionFrequency,
  type MissionStatus,
  type MissionAvailabilityType,
  type MissionBase,
} from "./mission.enums";

describe("mission.enums", () => {
  // ----------------------------------------------------------------
  // ACTIVITY_TYPES
  // ----------------------------------------------------------------
  describe("ACTIVITY_TYPES", () => {
    it("Doit contenir exactement 4 types d'activité", () => {
      expect(ACTIVITY_TYPES).toHaveLength(4);
    });

    it.each(["MISSION", "EVENT", "COLLECT", "INFO"])(
      'Doit contenir "%s"',
      (type) => {
        expect(ACTIVITY_TYPES).toContain(type);
      },
    );

    it("Ne doit pas contenir de valeur inattendue", () => {
      expect(ACTIVITY_TYPES).not.toContain("UNKNOWN");
      expect(ACTIVITY_TYPES).not.toContain("mission");
    });
  });

  // ----------------------------------------------------------------
  // MISSION_FREQUENCIES
  // ----------------------------------------------------------------
  describe("MISSION_FREQUENCIES", () => {
    it("Doit contenir exactement 4 fréquences", () => {
      expect(MISSION_FREQUENCIES).toHaveLength(4);
    });

    it.each(["ONCE", "DAILY", "WEEKLY", "MONTHLY"])(
      'Doit contenir "%s"',
      (freq) => {
        expect(MISSION_FREQUENCIES).toContain(freq);
      },
    );

    it("Ne doit pas contenir de valeur inattendue", () => {
      expect(MISSION_FREQUENCIES).not.toContain("BIWEEKLY");
      expect(MISSION_FREQUENCIES).not.toContain("YEARLY");
    });
  });

  // ----------------------------------------------------------------
  // MISSION_STATUSES
  // ----------------------------------------------------------------
  describe("MISSION_STATUSES", () => {
    it("Doit contenir exactement 3 statuts", () => {
      expect(MISSION_STATUSES).toHaveLength(3);
    });

    it.each(["ACTIVE", "ARCHIVED", "DELETED"])(
      'Doit contenir "%s"',
      (status) => {
        expect(MISSION_STATUSES).toContain(status);
      },
    );

    it("Ne doit pas contenir de valeur inattendue", () => {
      expect(MISSION_STATUSES).not.toContain("PENDING");
      expect(MISSION_STATUSES).not.toContain("CLOSED");
    });
  });

  // ----------------------------------------------------------------
  // MISSION_AVAILABILITY_TYPES
  // ----------------------------------------------------------------
  describe("MISSION_AVAILABILITY_TYPES", () => {
    it("Doit contenir exactement 3 types de disponibilité", () => {
      expect(MISSION_AVAILABILITY_TYPES).toHaveLength(3);
    });

    it.each(["REMOTE", "ON_SITE", "HYBRID"])(
      'Doit contenir "%s"',
      (type) => {
        expect(MISSION_AVAILABILITY_TYPES).toContain(type);
      },
    );

    it("Ne doit pas contenir de valeur inattendue", () => {
      expect(MISSION_AVAILABILITY_TYPES).not.toContain("IN_PERSON");
      expect(MISSION_AVAILABILITY_TYPES).not.toContain("remote");
    });
  });

  // ----------------------------------------------------------------
  // MissionBase — interface de base
  // ----------------------------------------------------------------
  describe("MissionBase (interface de base)", () => {
    it("Doit accepter un objet conforme à l'interface MissionBase", () => {
      const mission: MissionBase = {
        id: 1,
        title: "Distribution alimentaire",
        description: "Aide à la distribution de repas aux sans-abri.",
        type: "MISSION",
        availabilityType: "ON_SITE",
      };

      expect(mission.id).toBe(1);
      expect(mission.title).toBe("Distribution alimentaire");
      expect(mission.type).toBe("MISSION");
      expect(mission.availabilityType).toBe("ON_SITE");
    });

    it.each(ACTIVITY_TYPES)('Doit accepter type="%s"', (type: ActivityType) => {
      const mission: MissionBase = {
        id: 1,
        title: "Test",
        description: "Description",
        type,
        availabilityType: "REMOTE",
      };
      expect(mission.type).toBe(type);
    });

    it.each(MISSION_AVAILABILITY_TYPES)(
      'Doit accepter availabilityType="%s"',
      (availabilityType: MissionAvailabilityType) => {
        const mission: MissionBase = {
          id: 1,
          title: "Test",
          description: "Description",
          type: "MISSION",
          availabilityType,
        };
        expect(mission.availabilityType).toBe(availabilityType);
      },
    );
  });

  // ----------------------------------------------------------------
  // Utilisation comme type TypeScript (validation de typage)
  // ----------------------------------------------------------------
  describe("Types dérivés", () => {
    it("ActivityType ne doit accepter que les valeurs de ACTIVITY_TYPES", () => {
      const validTypes: ActivityType[] = ["MISSION", "EVENT", "COLLECT", "INFO"];
      validTypes.forEach((t) => {
        expect(ACTIVITY_TYPES).toContain(t);
      });
    });

    it("MissionFrequency ne doit accepter que les valeurs de MISSION_FREQUENCIES", () => {
      const validFrequencies: MissionFrequency[] = ["ONCE", "DAILY", "WEEKLY", "MONTHLY"];
      validFrequencies.forEach((f) => {
        expect(MISSION_FREQUENCIES).toContain(f);
      });
    });

    it("MissionStatus ne doit accepter que les valeurs de MISSION_STATUSES", () => {
      const validStatuses: MissionStatus[] = ["ACTIVE", "ARCHIVED", "DELETED"];
      validStatuses.forEach((s) => {
        expect(MISSION_STATUSES).toContain(s);
      });
    });

    it("MissionAvailabilityType ne doit accepter que les valeurs de MISSION_AVAILABILITY_TYPES", () => {
      const validTypes: MissionAvailabilityType[] = ["REMOTE", "ON_SITE", "HYBRID"];
      validTypes.forEach((t) => {
        expect(MISSION_AVAILABILITY_TYPES).toContain(t);
      });
    });
  });
});
