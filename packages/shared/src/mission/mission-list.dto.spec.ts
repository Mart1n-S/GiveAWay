import type {
  MissionListItem,
  MissionListResponse,
  MissionListQuery,
} from "./mission-list.dto";

describe("MissionListItem", () => {
  const baseAssociation = {
    id: 1,
    name: "Croix-Rouge Française",
    logoUrl: "https://cdn.example.com/logos/croix-rouge.png",
  };

  // ----------------------------------------------------------------
  // ✅ Structure d'un item de listing
  // ----------------------------------------------------------------
  describe("Structure du DTO", () => {
    it("Doit accepter un item de mission avec tous les champs renseignés", () => {
      const item: MissionListItem = {
        id: 1,
        title: "Distribution alimentaire",
        description: "Aide à la distribution de repas.",
        type: "MISSION",
        availabilityType: "ON_SITE",
        hasRegistration: true,
        volunteersNeeded: 5,
        durationInt: 3,
        frequency: "WEEKLY",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-06-30"),
        association: baseAssociation,
        address: {
          street: "98 Rue Didot",
          city: "Paris",
          postalCode: "75014",
          country: "France",
          latitude: 48.8264,
          longitude: 2.3212,
        },
        causes: [{ id: 1, name: "Aide alimentaire" }],
        skills: [{ id: 2, name: "Cuisine" }],
        volunteerTypes: [{ id: 1, label: "Bénévole ponctuel" }],
      };

      expect(item.id).toBe(1);
      expect(item.title).toBe("Distribution alimentaire");
      expect(item.type).toBe("MISSION");
      expect(item.hasRegistration).toBe(true);
      expect(item.volunteersNeeded).toBe(5);
      expect(item.causes).toHaveLength(1);
    });

    it("Doit accepter un item avec champs optionnels à null", () => {
      const item: MissionListItem = {
        id: 2,
        title: "Maraude",
        description: "Maraude nocturne.",
        type: "EVENT",
        availabilityType: "ON_SITE",
        hasRegistration: false,
        volunteersNeeded: null,
        durationInt: null,
        frequency: null,
        startDate: null,
        endDate: null,
        association: { id: 2, name: "Asso B", logoUrl: null },
        address: null,
        causes: [],
        skills: [],
        volunteerTypes: [],
      };

      expect(item.volunteersNeeded).toBeNull();
      expect(item.frequency).toBeNull();
      expect(item.address).toBeNull();
      expect(item.association.logoUrl).toBeNull();
    });
  });
});

describe("MissionListResponse", () => {
  const makeItem = (id: number): MissionListItem => ({
    id,
    title: `Mission ${id}`,
    description: "Description",
    type: "MISSION",
    availabilityType: "ON_SITE",
    hasRegistration: false,
    volunteersNeeded: null,
    durationInt: null,
    frequency: null,
    startDate: null,
    endDate: null,
    association: { id: 1, name: "Asso", logoUrl: null },
    address: null,
    causes: [],
    skills: [],
    volunteerTypes: [],
  });

  // ----------------------------------------------------------------
  // ✅ Structure de la réponse paginée
  // ----------------------------------------------------------------
  describe("Structure de la réponse paginée", () => {
    it("Doit accepter une réponse avec plusieurs missions", () => {
      const response: MissionListResponse = {
        missions: [makeItem(1), makeItem(2), makeItem(3)],
        total: 42,
        page: 1,
        pageSize: 12,
      };

      expect(response.missions).toHaveLength(3);
      expect(response.total).toBe(42);
      expect(response.page).toBe(1);
      expect(response.pageSize).toBe(12);
    });

    it("Doit accepter une réponse vide (aucune mission)", () => {
      const response: MissionListResponse = {
        missions: [],
        total: 0,
        page: 1,
        pageSize: 12,
      };

      expect(response.missions).toHaveLength(0);
      expect(response.total).toBe(0);
    });

    it("Doit correctement représenter la dernière page (moins de résultats que pageSize)", () => {
      const response: MissionListResponse = {
        missions: [makeItem(1), makeItem(2)],
        total: 14,
        page: 2,
        pageSize: 12,
      };

      expect(response.missions.length).toBeLessThan(response.pageSize);
      expect(response.page).toBe(2);
    });
  });
});

describe("MissionListQuery", () => {
  // ----------------------------------------------------------------
  // ✅ Interface de requête de listing
  // ----------------------------------------------------------------
  describe("Structure de la requête", () => {
    it("Doit accepter une requête vide (tous les champs sont optionnels)", () => {
      const query: MissionListQuery = {};
      expect(query).toBeDefined();
    });

    it("Doit accepter une requête complète", () => {
      const query: MissionListQuery = {
        page: 2,
        pageSize: 6,
        type: "EVENT",
        types: ["MISSION", "EVENT"],
        causeId: 1,
        causeIds: [1, 2],
        skillIds: [3],
        publicTypeIds: [1],
        volunteerTypeIds: [2],
        city: "Paris",
        search: "repas",
        frequency: "WEEKLY",
        startDateFrom: "2025-01-01",
        startDateTo: "2025-12-31",
        hasAvailableSpots: true,
        locationMode: "nearby",
      };

      expect(query.page).toBe(2);
      expect(query.types).toEqual(["MISSION", "EVENT"]);
      expect(query.locationMode).toBe("nearby");
      expect(query.hasAvailableSpots).toBe(true);
    });

    it('Doit accepter locationMode="remote"', () => {
      const query: MissionListQuery = { locationMode: "remote" };
      expect(query.locationMode).toBe("remote");
    });
  });
});
