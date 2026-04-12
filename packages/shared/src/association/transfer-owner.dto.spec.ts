import { TransferOwnerSchema } from "./transfer-owner.dto";

describe("TransferOwnerSchema", () => {
  // ----------------------------------------------------------------
  // ✅ Cas valides
  // ----------------------------------------------------------------
  describe("Cas valides", () => {
    it("Doit valider un identifiant entier positif", () => {
      const res = TransferOwnerSchema.safeParse({ newOwnerUserId: 1 });
      expect(res.success).toBe(true);
      if (res.success) expect(res.data.newOwnerUserId).toBe(1);
    });

    it("Doit valider un grand identifiant", () => {
      const res = TransferOwnerSchema.safeParse({ newOwnerUserId: 99999 });
      expect(res.success).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // ❌ Cas invalides — valeur manquante ou nulle
  // ----------------------------------------------------------------
  describe("Validation — valeur manquante", () => {
    it("Doit rejeter un objet sans champ newOwnerUserId", () => {
      const res = TransferOwnerSchema.safeParse({});
      expect(res.success).toBe(false);
    });

    it("Doit rejeter null", () => {
      const res = TransferOwnerSchema.safeParse({ newOwnerUserId: null });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter undefined", () => {
      const res = TransferOwnerSchema.safeParse({ newOwnerUserId: undefined });
      expect(res.success).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // ❌ Cas invalides — type incorrect
  // ----------------------------------------------------------------
  describe("Validation — type incorrect", () => {
    it("Doit rejeter une chaîne de caractères", () => {
      const res = TransferOwnerSchema.safeParse({ newOwnerUserId: "1" });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("nombre");
    });

    it("Doit rejeter un booléen", () => {
      const res = TransferOwnerSchema.safeParse({ newOwnerUserId: true });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un tableau", () => {
      const res = TransferOwnerSchema.safeParse({ newOwnerUserId: [1] });
      expect(res.success).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // ❌ Cas invalides — contraintes sur la valeur numérique
  // ----------------------------------------------------------------
  describe("Validation — contraintes numériques", () => {
    it("Doit rejeter zéro (doit être positif)", () => {
      const res = TransferOwnerSchema.safeParse({ newOwnerUserId: 0 });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("positif");
    });

    it("Doit rejeter un nombre négatif", () => {
      const res = TransferOwnerSchema.safeParse({ newOwnerUserId: -5 });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("positif");
    });

    it("Doit rejeter un nombre décimal", () => {
      const res = TransferOwnerSchema.safeParse({ newOwnerUserId: 1.5 });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("entier");
    });
  });
});
