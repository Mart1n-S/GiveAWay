import { ChangePasswordSchema } from "./change-password.dto";
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "./auth.constants";

describe("ChangePassword DTOs", () => {
  // Un jeu de données valide de base pour éviter de tout réécrire
  const validData = {
    oldPassword: "OldPassword123!",
    newPassword: "NewPassword123!",
    confirmPassword: "NewPassword123!",
  };

  // --- ✅ Cas Valides ---
  it("Devrait valider des données correctes", () => {
    const result = ChangePasswordSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  // --- ❌ Cas Invalides ---
  it("Devrait échouer si la confirmation ne correspond pas au mot de passe", () => {
    const data = {
      ...validData,
      confirmPassword: "MismatchPassword123!",
    };
    const result = ChangePasswordSchema.safeParse(data);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Les mots de passe ne correspondent pas",
      );
      expect(result.error.issues[0].path).toContain("confirmPassword");
    }
  });

  it("Devrait échouer si le nouveau mot de passe est identique à l'ancien", () => {
    const data = {
      oldPassword: "SamePassword123!",
      newPassword: "SamePassword123!",
      confirmPassword: "SamePassword123!",
    };
    const result = ChangePasswordSchema.safeParse(data);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Le nouveau mot de passe doit être différent de l'ancien",
      );
      expect(result.error.issues[0].path).toContain("newPassword");
    }
  });

  it("Devrait échouer si le mot de passe est trop court", () => {
    const shortPass = "A1!a".padEnd(PASSWORD_MIN_LENGTH - 1, "a"); // Juste en dessous de la limite
    const data = {
      ...validData,
      newPassword: shortPass,
      confirmPassword: shortPass,
    };
    const result = ChangePasswordSchema.safeParse(data);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        `au moins ${PASSWORD_MIN_LENGTH} caractères`,
      );
    }
  });

  it("Devrait échouer si le mot de passe est trop long", () => {
    const longPass = "A1!a".padEnd(PASSWORD_MAX_LENGTH + 1, "a"); // Juste au dessus
    const data = {
      ...validData,
      newPassword: longPass,
      confirmPassword: longPass,
    };
    const result = ChangePasswordSchema.safeParse(data);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        `ne peut pas dépasser ${PASSWORD_MAX_LENGTH}`,
      );
    }
  });

  it("Devrait échouer sans majuscule", () => {
    const noCap = "password123!";
    const result = ChangePasswordSchema.safeParse({
      ...validData,
      newPassword: noCap,
      confirmPassword: noCap,
    });
    expect(result.success).toBe(false);
  });

  it("Devrait échouer sans minuscule", () => {
    const noLower = "PASSWORD123!";
    const result = ChangePasswordSchema.safeParse({
      ...validData,
      newPassword: noLower,
      confirmPassword: noLower,
    });
    expect(result.success).toBe(false);
  });

  it("Devrait échouer sans chiffre", () => {
    const noDigit = "Passworddd!";
    const result = ChangePasswordSchema.safeParse({
      ...validData,
      newPassword: noDigit,
      confirmPassword: noDigit,
    });
    expect(result.success).toBe(false);
  });

  it("Devrait échouer sans caractère spécial", () => {
    const noSpecial = "Password1234";
    const result = ChangePasswordSchema.safeParse({
      ...validData,
      newPassword: noSpecial,
      confirmPassword: noSpecial,
    });
    expect(result.success).toBe(false);
  });

  it("Devrait échouer si l'ancien mot de passe est vide", () => {
    const data = { ...validData, oldPassword: "" };
    const result = ChangePasswordSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("Devrait échouer si le nouveau mot de passe est vide", () => {
    const data = { ...validData, newPassword: "", confirmPassword: "" };
    const result = ChangePasswordSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
