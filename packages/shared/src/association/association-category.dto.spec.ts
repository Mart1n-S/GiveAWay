import type { AssociationCategory } from "./association-category.dto";

describe("AssociationCategory", () => {
  // ----------------------------------------------------------------
  // ✅ Structure du DTO
  // ----------------------------------------------------------------
  describe("Structure du DTO", () => {
    it("Doit accepter une catégorie avec id et name valides", () => {
      const category: AssociationCategory = {
        id: 1,
        name: "Humanitaire",
      };

      expect(category.id).toBe(1);
      expect(category.name).toBe("Humanitaire");
    });

    it("Doit accepter toutes les catégories de la seed", () => {
      const categories: AssociationCategory[] = [
        { id: 1, name: "Aide alimentaire" },
        { id: 2, name: "Aide aux personnes âgées" },
        { id: 3, name: "Aide aux personnes handicapées" },
        { id: 4, name: "Aide aux sans-abri" },
        { id: 5, name: "Aide à l'enfance" },
        { id: 6, name: "Environnement et écologie" },
        { id: 7, name: "Éducation et formation" },
        { id: 8, name: "Sport et loisirs" },
        { id: 9, name: "Culture et patrimoine" },
      ];

      expect(categories).toHaveLength(9);
      categories.forEach((cat) => {
        expect(typeof cat.id).toBe("number");
        expect(typeof cat.name).toBe("string");
        expect(cat.id).toBeGreaterThan(0);
        expect(cat.name.length).toBeGreaterThan(0);
      });
    });
  });

  // ----------------------------------------------------------------
  // ✅ Typage des champs
  // ----------------------------------------------------------------
  describe("Types des champs", () => {
    it("id doit être un number", () => {
      const category: AssociationCategory = { id: 42, name: "Sport" };
      expect(typeof category.id).toBe("number");
    });

    it("name doit être une string", () => {
      const category: AssociationCategory = { id: 1, name: "Humanitaire" };
      expect(typeof category.name).toBe("string");
    });
  });

  // ----------------------------------------------------------------
  // ✅ Utilisation dans un tableau
  // ----------------------------------------------------------------
  describe("Tableau de catégories", () => {
    it("Doit pouvoir être utilisé dans un tableau vide", () => {
      const categories: AssociationCategory[] = [];
      expect(categories).toHaveLength(0);
    });

    it("Doit pouvoir filtrer par id", () => {
      const categories: AssociationCategory[] = [
        { id: 1, name: "Humanitaire" },
        { id: 2, name: "Environnement" },
        { id: 3, name: "Éducation" },
      ];

      const found = categories.find((c) => c.id === 2);
      expect(found?.name).toBe("Environnement");
    });
  });
});
