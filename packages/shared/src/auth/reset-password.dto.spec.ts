import { ResetPasswordSchema } from "./reset-password.dto";

describe("ResetPassword DTOs", () => {
  // ===========================================================================
  // TESTS RESET PASSWORD
  // ===========================================================================
  describe("ResetPasswordSchema", () => {
    const validResetData = {
      code: "123456",
      password: "NewPassword123!",
      confirmPassword: "NewPassword123!",
    };

    // --- ✅ Cas Valides ---
    it("Doit valider une réinitialisation correcte", () => {
      const res = ResetPasswordSchema.safeParse(validResetData);
      expect(res.success).toBe(true);
    });

    // --- ❌ Cas Invalides ---
    it("Doit rejeter si le code est manquant ou vide", () => {
      const res = ResetPasswordSchema.safeParse({
        ...validResetData,
        code: "",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain(
          "Le code doit contenir exactement 6 chiffres",
        );
      }
    });

    it("Doit rejeter si les mots de passe ne correspondent pas", () => {
      const res = ResetPasswordSchema.safeParse({
        ...validResetData,
        password: "NewPassword123!",
        confirmPassword: "DifferentPassword123!",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe(
          "Les mots de passe ne correspondent pas",
        );
        expect(res.error.issues[0].path).toContain("confirmPassword");
      }
    });

    it("Doit rejeter un mot de passe trop faible (Regex check)", () => {
      // Même regex que Register, on vérifie juste qu'elle est bien appliquée ici aussi
      const res = ResetPasswordSchema.safeParse({
        ...validResetData,
        password: "weak",
        confirmPassword: "weak",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        // Zod peut renvoyer plusieurs erreurs (longueur + regex), on vérifie qu'on a des erreurs
        expect(res.error.issues.length).toBeGreaterThan(0);
      }
    });
  });
});
