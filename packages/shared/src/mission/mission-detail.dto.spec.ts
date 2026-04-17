import type { MissionDetail } from "./mission-detail.dto";

describe("MissionDetail", () => {
  const baseAssociation = {
    id: 1,
    name: "Croix-Rouge Française",
    logoUrl: "https://cdn.example.com/logos/croix-rouge.png",
    description: "Association humanitaire.",
    website: "https://www.croix-rouge.fr",
  };

  const baseAddress = {
    street: "98 Rue Didot",
    city: "Paris",
    postalCode: "75014",
    country: "France",
    latitude: 48.8264,
    longitude: 2.3212,
  };

  // ----------------------------------------------------------------
  // ✅ Structure complète
  // ----------------------------------------------------------------
  describe("Structure complète", () => {
    it("Doit accepter un détail de mission avec tous les champs renseignés", () => {
      const mission: MissionDetail = {
        id: 1,
        title: "Distribution alimentaire",
        description: "Aide à la distribution de repas aux sans-abri.",
        type: "MISSION",
        availabilityType: "ON_SITE",
        status: "ACTIVE",
        hasRegistration: true,
        volunteersNeeded: 5,
        durationInt: 3,
        frequency: "WEEKLY",
        startDate: new Date("2025-01-15"),
        endDate: new Date("2025-06-30"),
        participantsCount: 12,
        association: baseAssociation,
        address: baseAddress,
        causes: [{ id: 1, name: "Aide alimentaire" }],
        skills: [{ id: 2, name: "Cuisine" }],
        volunteerTypes: [{ id: 1, label: "Bénévole ponctuel" }],
        publicTypes: [{ id: 3, label: "Personnes âgées" }],
      };

      expect(mission.id).toBe(1);
      expect(mission.title).toBe("Distribution alimentaire");
      expect(mission.status).toBe("ACTIVE");
      expect(mission.hasRegistration).toBe(true);
      expect(mission.volunteersNeeded).toBe(5);
      expect(mission.participantsCount).toBe(12);
      expect(mission.causes).toHaveLength(1);
      expect(mission.skills).toHaveLength(1);
    });

    it("Doit accepter un détail de mission avec champs optionnels à null", () => {
      const mission: MissionDetail = {
        id: 2,
        title: "Maraude nocturne",
        description: "Accompagnement de nuit.",
        type: "EVENT",
        availabilityType: "ON_SITE",
        status: "ACTIVE",
        hasRegistration: false,
        volunteersNeeded: null,
        durationInt: null,
        frequency: null,
        startDate: null,
        endDate: null,
        participantsCount: 0,
        association: {
          id: 2,
          name: "Asso B",
          logoUrl: null,
          description: null,
          website: null,
        },
        address: null,
        causes: [],
        skills: [],
        volunteerTypes: [],
        publicTypes: [],
      };

      expect(mission.volunteersNeeded).toBeNull();
      expect(mission.frequency).toBeNull();
      expect(mission.startDate).toBeNull();
      expect(mission.address).toBeNull();
      expect(mission.causes).toHaveLength(0);
    });
  });

  // ----------------------------------------------------------------
  // ✅ Statuts de mission
  // ----------------------------------------------------------------
  describe("Statuts (MissionStatus)", () => {
    it.each(["ACTIVE", "ARCHIVED", "DELETED"] as const)(
      'Doit accepter le statut "%s"',
      (status) => {
        const mission: MissionDetail = {
          id: 1,
          title: "Test",
          description: "Test",
          type: "MISSION",
          availabilityType: "REMOTE",
          status,
          hasRegistration: false,
          volunteersNeeded: null,
          durationInt: null,
          frequency: null,
          startDate: null,
          endDate: null,
          participantsCount: 0,
          association: { id: 1, name: "Asso", logoUrl: null, description: null, website: null },
          address: null,
          causes: [],
          skills: [],
          volunteerTypes: [],
          publicTypes: [],
        };
        expect(mission.status).toBe(status);
      },
    );
  });

  // ----------------------------------------------------------------
  // ✅ Dates sous forme de string ISO
  // ----------------------------------------------------------------
  describe("Dates", () => {
    it("Doit accepter startDate sous forme de string ISO", () => {
      const mission: MissionDetail = {
        id: 1,
        title: "Test",
        description: "Test",
        type: "COLLECT",
        availabilityType: "ON_SITE",
        status: "ACTIVE",
        hasRegistration: false,
        volunteersNeeded: null,
        durationInt: null,
        frequency: null,
        startDate: "2025-04-01T09:00:00.000Z",
        endDate: "2025-04-01T12:00:00.000Z",
        participantsCount: 3,
        association: { id: 1, name: "Asso", logoUrl: null, description: null, website: null },
        address: null,
        causes: [],
        skills: [],
        volunteerTypes: [],
        publicTypes: [],
      };

      expect(typeof mission.startDate).toBe("string");
      expect(typeof mission.endDate).toBe("string");
    });
  });

  // ----------------------------------------------------------------
  // ✅ Types d'activité et disponibilité
  // ----------------------------------------------------------------
  describe("Types d'activité et de disponibilité", () => {
    it.each(["MISSION", "EVENT", "COLLECT", "INFO"] as const)(
      'Doit accepter type="%s"',
      (type) => {
        const mission: MissionDetail = {
          id: 1,
          title: "Test",
          description: "Test",
          type,
          availabilityType: "HYBRID",
          status: "ACTIVE",
          hasRegistration: false,
          volunteersNeeded: null,
          durationInt: null,
          frequency: null,
          startDate: null,
          endDate: null,
          participantsCount: 0,
          association: { id: 1, name: "Asso", logoUrl: null, description: null, website: null },
          address: null,
          causes: [],
          skills: [],
          volunteerTypes: [],
          publicTypes: [],
        };
        expect(mission.type).toBe(type);
      },
    );

    it.each(["REMOTE", "ON_SITE", "HYBRID"] as const)(
      'Doit accepter availabilityType="%s"',
      (availabilityType) => {
        const mission: MissionDetail = {
          id: 1,
          title: "Test",
          description: "Test",
          type: "MISSION",
          availabilityType,
          status: "ACTIVE",
          hasRegistration: false,
          volunteersNeeded: null,
          durationInt: null,
          frequency: null,
          startDate: null,
          endDate: null,
          participantsCount: 0,
          association: { id: 1, name: "Asso", logoUrl: null, description: null, website: null },
          address: null,
          causes: [],
          skills: [],
          volunteerTypes: [],
          publicTypes: [],
        };
        expect(mission.availabilityType).toBe(availabilityType);
      },
    );
  });
});
