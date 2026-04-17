import { ForgotPasswordSchema } from "./forgot-password.dto";

describe("ForgotPassword DTOs", () => {
  // ===========================================================================
  // TESTS FORGOT PASSWORD
  // ===========================================================================
  describe("ForgotPasswordSchema", () => {
    // --- ✅ Cas Valides ---
    it("Doit valider un email correct", () => {
      const res = ForgotPasswordSchema.safeParse({
        email: "forgot@test.com",
      });
      expect(res.success).toBe(true);
    });

    it("Doit nettoyer (trim + lowercase) l'email", () => {
      const res = ForgotPasswordSchema.safeParse({
        email: "  MyEmail@Test.com  ",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.email).toBe("myemail@test.com");
      }
    });

    // --- ❌ Cas Invalides ---
    it("Doit rejeter un email invalide", () => {
      const res = ForgotPasswordSchema.safeParse({
        email: "not-an-email",
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un email vide", () => {
      const res = ForgotPasswordSchema.safeParse({
        email: "",
      });
      expect(res.success).toBe(false);
    });
  });
});
