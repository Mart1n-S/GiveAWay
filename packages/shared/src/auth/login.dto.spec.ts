import { LoginSchema } from "./login.dto";

describe("Login DTOs", () => {
  // ===========================================================================
  // TESTS LOGIN
  // ===========================================================================
  describe("LoginSchema", () => {
    // --- ✅ Cas Valides ---
    it("Doit valider un login correct", () => {
      const data = { email: "test@test.com", password: "password" };
      const res = LoginSchema.safeParse(data);
      expect(res.success).toBe(true);
    });

    it("Doit nettoyer (trim/lower) l'email", () => {
      const data = { email: "  Test@Test.com  ", password: "password" };
      const res = LoginSchema.safeParse(data);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.email).toBe("test@test.com");
      }
    });

    // --- ❌ Cas Invalides ---
    it("Doit rejeter un email invalide", () => {
      const data = { email: "invalid-email", password: "password" };
      const res = LoginSchema.safeParse(data);
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un mot de passe vide", () => {
      const data = { email: "test@test.com", password: "" };
      const res = LoginSchema.safeParse(data);
      expect(res.success).toBe(false);
    });
  });
});
