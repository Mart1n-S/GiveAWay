import { UpdateMemberRoleSchema } from "./update-member-role.dto";

describe("UpdateMemberRoleSchema", () => {
  // ----------------------------------------------------------------
  // ✅ Cas valides
  // ----------------------------------------------------------------
  describe("Cas valides", () => {
    it("Doit valider le rôle ADMIN", () => {
      const res = UpdateMemberRoleSchema.safeParse({ role: "ADMIN" });
      expect(res.success).toBe(true);
      if (res.success) expect(res.data.role).toBe("ADMIN");
    });

    it("Doit valider le rôle EDITOR", () => {
      const res = UpdateMemberRoleSchema.safeParse({ role: "EDITOR" });
      expect(res.success).toBe(true);
      if (res.success) expect(res.data.role).toBe("EDITOR");
    });
  });

  // ----------------------------------------------------------------
  // ❌ Cas invalides — rôle OWNER interdit
  // ----------------------------------------------------------------
  describe("Validation — rôle OWNER interdit", () => {
    it("Doit rejeter le rôle OWNER (utiliser /transfer-owner à la place)", () => {
      const res = UpdateMemberRoleSchema.safeParse({ role: "OWNER" });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("ADMIN ou EDITOR");
    });
  });

  // ----------------------------------------------------------------
  // ❌ Cas invalides — valeurs incorrectes
  // ----------------------------------------------------------------
  describe("Validation — valeurs incorrectes", () => {
    it("Doit rejeter un rôle inconnu", () => {
      const res = UpdateMemberRoleSchema.safeParse({ role: "SUPERADMIN" });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("ADMIN ou EDITOR");
    });

    it("Doit rejeter une valeur en minuscules", () => {
      const res = UpdateMemberRoleSchema.safeParse({ role: "admin" });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un nombre à la place d'un rôle", () => {
      const res = UpdateMemberRoleSchema.safeParse({ role: 1 });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un objet sans champ role", () => {
      const res = UpdateMemberRoleSchema.safeParse({});
      expect(res.success).toBe(false);
    });

    it("Doit rejeter null comme valeur de rôle", () => {
      const res = UpdateMemberRoleSchema.safeParse({ role: null });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter une chaîne vide", () => {
      const res = UpdateMemberRoleSchema.safeParse({ role: "" });
      expect(res.success).toBe(false);
    });
  });
});
