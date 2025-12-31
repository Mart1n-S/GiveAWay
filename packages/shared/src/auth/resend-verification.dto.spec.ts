import { ResendVerificationSchema } from "./resend-verification.dto";

describe("ResendVerificationSchema (Zod)", () => {
  // --- ✅ CAS VALIDES (HAPPY PATH & SANITIZATION) ---

  it("Doit valider un email standard", () => {
    const input = { email: "test@example.com" };
    const result = ResendVerificationSchema.safeParse(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("test@example.com");
    }
  });

  it("Doit accepter et transformer les majuscules (toLowerCase)", () => {
    const input = { email: "User.Test@Example.COM" };
    const result = ResendVerificationSchema.safeParse(input);

    expect(result.success).toBe(true);
    if (result.success) {
      // Vérifie que Zod a bien fait le job de transformation
      expect(result.data.email).toBe("user.test@example.com");
    }
  });

  it("Doit accepter et nettoyer les espaces inutiles (trim)", () => {
    const input = { email: "   user@test.com   " };
    const result = ResendVerificationSchema.safeParse(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@test.com");
    }
  });

  // --- ❌ CAS INVALIDES (ERROR HANDLING) ---

  it("Doit rejeter un email vide", () => {
    const input = { email: "" };
    const result = ResendVerificationSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      // On vérifie le message d'erreur spécifique défini dans ton DTO
      expect(result.error.issues[0].message).toBe("L'email est obligatoire");
    }
  });

  it("Doit rejeter un email avec seulement des espaces (trim + min)", () => {
    const input = { email: "     " };
    const result = ResendVerificationSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      // Après le .trim(), la string est vide, donc c'est l'erreur .min(1) qui tombe
      expect(result.error.issues[0].message).toBe("L'email est obligatoire");
    }
  });

  it("Doit rejeter un email sans @", () => {
    const input = { email: "testexample.com" };
    const result = ResendVerificationSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Format d'email invalide");
    }
  });

  it("Doit rejeter un email sans domaine", () => {
    const input = { email: "test@" };
    const result = ResendVerificationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("Doit rejeter un email sans nom d'utilisateur", () => {
    const input = { email: "@example.com" };
    const result = ResendVerificationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("Doit rejeter un email sans extension", () => {
    const input = { email: "test@example" };
    const result = ResendVerificationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("Doit rejeter une chaîne qui n'est pas un email", () => {
    const input = { email: "not-an-email" };
    const result = ResendVerificationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("Doit rejeter une tentative d'injection XSS basique", () => {
    const input = { email: "<script>alert(1)</script>" };
    const result = ResendVerificationSchema.safeParse(input);

    expect(result.success).toBe(false);
    // Zod va dire "Invalid email" car les chevrons < > ne sont pas standards sans guillemets
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Format d'email invalide");
    }
  });
});
