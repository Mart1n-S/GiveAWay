import type { AssociationMapItem } from "./association-map.dto";

describe("AssociationMapItem", () => {
  // ----------------------------------------------------------------
  // ✅ Structure complète
  // ----------------------------------------------------------------
  describe("Structure du DTO", () => {
    it("Doit accepter un item avec tous les champs renseignés", () => {
      const item: AssociationMapItem = {
        id: 1,
        name: "Croix-Rouge Française",
        logoUrl: "https://cdn.example.com/logos/croix-rouge.png",
        city: "Paris",
        latitude: 48.8566,
        longitude: 2.3522,
        description: "Association humanitaire internationale.",
        website: "https://www.croix-rouge.fr",
        category: "Humanitaire",
      };

      expect(item.id).toBe(1);
      expect(item.name).toBe("Croix-Rouge Française");
      expect(item.city).toBe("Paris");
      expect(item.latitude).toBe(48.8566);
      expect(item.longitude).toBe(2.3522);
    });

    it("Doit accepter un item avec les champs optionnels à null", () => {
      const item: AssociationMapItem = {
        id: 2,
        name: "Asso Sans Logo",
        logoUrl: null,
        city: "Lyon",
        latitude: 45.7640,
        longitude: 4.8357,
        description: null,
        website: null,
        category: null,
      };

      expect(item.logoUrl).toBeNull();
      expect(item.description).toBeNull();
      expect(item.website).toBeNull();
      expect(item.category).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  // ✅ Coordonnées géographiques
  // ----------------------------------------------------------------
  describe("Coordonnées géographiques", () => {
    it("Doit accepter des coordonnées GPS valides pour Paris", () => {
      const item: AssociationMapItem = {
        id: 1,
        name: "Asso Paris",
        logoUrl: null,
        city: "Paris",
        latitude: 48.8566,
        longitude: 2.3522,
        description: null,
        website: null,
        category: null,
      };

      expect(item.latitude).toBeGreaterThanOrEqual(-90);
      expect(item.latitude).toBeLessThanOrEqual(90);
      expect(item.longitude).toBeGreaterThanOrEqual(-180);
      expect(item.longitude).toBeLessThanOrEqual(180);
    });

    it("Doit accepter des coordonnées négatives (hémisphère sud / longitude ouest)", () => {
      const item: AssociationMapItem = {
        id: 2,
        name: "Asso Réunion",
        logoUrl: null,
        city: "Saint-Denis",
        latitude: -20.8789,
        longitude: 55.4481,
        description: null,
        website: null,
        category: null,
      };

      expect(item.latitude).toBeLessThan(0);
    });
  });

  // ----------------------------------------------------------------
  // ✅ Utilisation dans un tableau (résultat d'une recherche carte)
  // ----------------------------------------------------------------
  describe("Tableau d'items", () => {
    it("Doit pouvoir être utilisé dans un tableau vide (aucun résultat)", () => {
      const results: AssociationMapItem[] = [];
      expect(results).toHaveLength(0);
    });

    it("Doit pouvoir filtrer par catégorie", () => {
      const items: AssociationMapItem[] = [
        { id: 1, name: "Asso A", logoUrl: null, city: "Paris", latitude: 48.85, longitude: 2.35, description: null, website: null, category: "Humanitaire" },
        { id: 2, name: "Asso B", logoUrl: null, city: "Lyon", latitude: 45.76, longitude: 4.83, description: null, website: null, category: "Environnement" },
        { id: 3, name: "Asso C", logoUrl: null, city: "Bordeaux", latitude: 44.84, longitude: -0.57, description: null, website: null, category: "Humanitaire" },
      ];

      const humanitaire = items.filter((i) => i.category === "Humanitaire");
      expect(humanitaire).toHaveLength(2);
    });
  });
});
