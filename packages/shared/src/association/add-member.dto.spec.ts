import { AddMemberSchema } from "./add-member.dto";

describe("AddMemberSchema", () => {
  // ----------------------------------------------------------------
  // ✅ Cas valides
  // ----------------------------------------------------------------
  describe("Cas valides", () => {
    it("Doit valider un email correct", () => {
      const res = AddMemberSchema.safeParse({ email: "alice@example.com" });
      expect(res.success).toBe(true);
    });

    it("Doit normaliser l'email en minuscules", () => {
      const res = AddMemberSchema.safeParse({ email: "ALICE@EXAMPLE.COM" });
      expect(res.success).toBe(true);
      if (res.success) expect(res.data.email).toBe("alice@example.com");
    });

    it("Doit supprimer les espaces autour de l'email (trim)", () => {
      const res = AddMemberSchema.safeParse({ email: "  alice@example.com  " });
      expect(res.success).toBe(true);
      if (res.success) expect(res.data.email).toBe("alice@example.com");
    });

    it("Doit normaliser un email avec majuscules et espaces combinés", () => {
      const res = AddMemberSchema.safeParse({
        email: "  ALICE@EXAMPLE.COM  ",
      });
      expect(res.success).toBe(true);
      if (res.success) expect(res.data.email).toBe("alice@example.com");
    });

    it("Doit accepter un email avec sous-domaine", () => {
      const res = AddMemberSchema.safeParse({
        email: "contact@mail.association.fr",
      });
      expect(res.success).toBe(true);
    });

    it("Doit accepter un email avec des chiffres", () => {
      const res = AddMemberSchema.safeParse({ email: "user123@test.org" });
      expect(res.success).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // ❌ Cas invalides — email manquant ou vide
  // ----------------------------------------------------------------
  describe("Validation — email manquant ou vide", () => {
    it("Doit rejeter un objet sans champ email", () => {
      const res = AddMemberSchema.safeParse({});
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un email vide", () => {
      const res = AddMemberSchema.safeParse({ email: "" });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("obligatoire");
    });

    it("Doit rejeter un email constitué uniquement d'espaces", () => {
      const res = AddMemberSchema.safeParse({ email: "   " });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("obligatoire");
    });
  });

  // ----------------------------------------------------------------
  // ❌ Cas invalides — format email
  // ----------------------------------------------------------------
  describe("Validation — format email", () => {
    it("Doit rejeter un email sans @", () => {
      const res = AddMemberSchema.safeParse({ email: "pasunemaildutout" });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("invalide");
    });

    it("Doit rejeter un email sans domaine", () => {
      const res = AddMemberSchema.safeParse({ email: "alice@" });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un email sans extension TLD", () => {
      const res = AddMemberSchema.safeParse({ email: "alice@example" });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un email avec des espaces internes", () => {
      const res = AddMemberSchema.safeParse({ email: "alice @example.com" });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un nombre à la place d'un email", () => {
      const res = AddMemberSchema.safeParse({ email: 42 });
      expect(res.success).toBe(false);
    });
  });
});
