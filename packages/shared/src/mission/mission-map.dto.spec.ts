import type { MissionMapItem } from "./mission-map.dto";

describe("MissionMapItem", () => {
  // ----------------------------------------------------------------
  // ✅ Structure complète
  // ----------------------------------------------------------------
  describe("Structure du DTO", () => {
    it("Doit accepter un item avec tous les champs renseignés", () => {
      const item: MissionMapItem = {
        id: 1,
        title: "Distribution alimentaire",
        description: "Aide à la distribution de repas aux sans-abri.",
        type: "MISSION",
        availabilityType: "ON_SITE",
        latitude: 48.8566,
        longitude: 2.3522,
        city: "Paris",
        association: {
          name: "Croix-Rouge Française",
          logoUrl: "https://cdn.example.com/logos/croix-rouge.png",
        },
      };

      expect(item.id).toBe(1);
      expect(item.title).toBe("Distribution alimentaire");
      expect(item.latitude).toBe(48.8566);
      expect(item.longitude).toBe(2.3522);
      expect(item.city).toBe("Paris");
      expect(item.association.name).toBe("Croix-Rouge Française");
    });

    it("Doit accepter un item avec les champs optionnels à null", () => {
      const item: MissionMapItem = {
        id: 2,
        title: "Maraude nocturne",
        description: "Maraude de nuit.",
        type: "EVENT",
        availabilityType: "ON_SITE",
        latitude: 45.7640,
        longitude: 4.8357,
        city: null,
        association: {
          name: "Asso Locale",
          logoUrl: null,
        },
      };

      expect(item.city).toBeNull();
      expect(item.association.logoUrl).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  // ✅ Coordonnées géographiques
  // ----------------------------------------------------------------
  describe("Coordonnées géographiques", () => {
    it("Doit accepter des coordonnées GPS valides", () => {
      const item: MissionMapItem = {
        id: 1,
        title: "Mission test",
        description: "Description",
        type: "MISSION",
        availabilityType: "ON_SITE",
        latitude: 48.8566,
        longitude: 2.3522,
        city: "Paris",
        association: { name: "Asso", logoUrl: null },
      };

      expect(item.latitude).toBeGreaterThanOrEqual(-90);
      expect(item.latitude).toBeLessThanOrEqual(90);
      expect(item.longitude).toBeGreaterThanOrEqual(-180);
      expect(item.longitude).toBeLessThanOrEqual(180);
    });

    it("Doit accepter des coordonnées négatives (hémisphère sud / longitude ouest)", () => {
      const item: MissionMapItem = {
        id: 2,
        title: "Mission Réunion",
        description: "Description",
        type: "COLLECT",
        availabilityType: "ON_SITE",
        latitude: -20.8789,
        longitude: 55.4481,
        city: "Saint-Denis",
        association: { name: "Asso Réunion", logoUrl: null },
      };

      expect(item.latitude).toBeLessThan(0);
    });
  });

  // ----------------------------------------------------------------
  // ✅ Types d'activité et de disponibilité
  // ----------------------------------------------------------------
  describe("Types d'activité", () => {
    it.each(["MISSION", "EVENT", "COLLECT", "INFO"] as const)(
      'Doit accepter type="%s"',
      (type) => {
        const item: MissionMapItem = {
          id: 1,
          title: "Test",
          description: "Description",
          type,
          availabilityType: "ON_SITE",
          latitude: 48.85,
          longitude: 2.35,
          city: "Paris",
          association: { name: "Asso", logoUrl: null },
        };
        expect(item.type).toBe(type);
      },
    );

    it.each(["REMOTE", "ON_SITE", "HYBRID"] as const)(
      'Doit accepter availabilityType="%s"',
      (availabilityType) => {
        const item: MissionMapItem = {
          id: 1,
          title: "Test",
          description: "Description",
          type: "MISSION",
          availabilityType,
          latitude: 48.85,
          longitude: 2.35,
          city: "Paris",
          association: { name: "Asso", logoUrl: null },
        };
        expect(item.availabilityType).toBe(availabilityType);
      },
    );
  });

  // ----------------------------------------------------------------
  // ✅ Utilisation dans un tableau (résultat carte)
  // ----------------------------------------------------------------
  describe("Tableau d'items carte", () => {
    it("Doit accepter un tableau vide (aucun résultat)", () => {
      const results: MissionMapItem[] = [];
      expect(results).toHaveLength(0);
    });

    it("Doit pouvoir filtrer les missions par type", () => {
      const items: MissionMapItem[] = [
        { id: 1, title: "M1", description: "D", type: "MISSION", availabilityType: "ON_SITE", latitude: 48.85, longitude: 2.35, city: "Paris", association: { name: "A", logoUrl: null } },
        { id: 2, title: "M2", description: "D", type: "EVENT", availabilityType: "ON_SITE", latitude: 45.76, longitude: 4.83, city: "Lyon", association: { name: "B", logoUrl: null } },
        { id: 3, title: "M3", description: "D", type: "MISSION", availabilityType: "REMOTE", latitude: 43.29, longitude: 5.38, city: "Marseille", association: { name: "C", logoUrl: null } },
      ];

      const missions = items.filter((i) => i.type === "MISSION");
      expect(missions).toHaveLength(2);
    });
  });
});
