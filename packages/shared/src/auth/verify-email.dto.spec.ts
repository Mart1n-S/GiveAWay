import { VerifyEmailSchema } from "./verify-email.dto";

describe("VerifyEmail DTOs", () => {
  // ===========================================================================
  // TESTS VERIFY EMAIL
  // ===========================================================================
  describe("VerifyEmailSchema", () => {
    // --- ✅ Cas valides ---
    it("Doit valider un code de 6 chiffres", () => {
      const res = VerifyEmailSchema.safeParse({
        code: "123456",
      });

      expect(res.success).toBe(true);
    });

    it("Doit trim le code avant validation", () => {
      const res = VerifyEmailSchema.safeParse({
        code: "  123456  ",
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.code).toBe("123456");
      }
    });

    // --- ❌ Cas invalides ---
    it("Doit rejeter un code trop court (<6)", () => {
      const res = VerifyEmailSchema.safeParse({
        code: "12345",
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("6 chiffres");
      }
    });

    it("Doit rejeter un code trop long (>6)", () => {
      const res = VerifyEmailSchema.safeParse({
        code: "1234567",
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("6 chiffres");
      }
    });

    it("Doit rejeter un code vide", () => {
      const res = VerifyEmailSchema.safeParse({
        code: "",
      });

      expect(res.success).toBe(false);
    });

    it("Doit rejeter un code contenant des espaces internes", () => {
      const res = VerifyEmailSchema.safeParse({
        code: "12 345",
      });

      expect(res.success).toBe(false);
    });

    it("Doit rejeter un code non string", () => {
      const res = VerifyEmailSchema.safeParse({
        code: 123456,
      });

      expect(res.success).toBe(false);
    });

    it("Doit rejeter un objet sans champ code", () => {
      const res = VerifyEmailSchema.safeParse({});

      expect(res.success).toBe(false);
    });

    it("Doit rejeter null ou undefined", () => {
      const res1 = VerifyEmailSchema.safeParse(null);
      const res2 = VerifyEmailSchema.safeParse(undefined);

      expect(res1.success).toBe(false);
      expect(res2.success).toBe(false);
    });

    it("Doit rejeter un code avec des lettres", () => {
      const res = VerifyEmailSchema.safeParse({
        code: "12A456",
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain(
          "ne doit contenir que des chiffres",
        );
      }
    });
  });
});
