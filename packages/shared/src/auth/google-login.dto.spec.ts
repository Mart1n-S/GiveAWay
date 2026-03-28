import { GoogleLoginSchema } from "./google-login.dto";

describe("Google Login DTOs", () => {
  describe("GoogleLoginSchema", () => {
    // --- ✅ Cas Valides ---
    it("Doit valider un token Google correct", () => {
      const data = { idToken: "valid.google.token" };
      const res = GoogleLoginSchema.safeParse(data);
      expect(res.success).toBe(true);
    });

    it("Doit mettre isAccessToken à false par défaut", () => {
      const data = { idToken: "valid.google.token" };
      const res = GoogleLoginSchema.safeParse(data);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.isAccessToken).toBe(false);
      }
    });

    it("Doit accepter isAccessToken à true", () => {
      const data = { idToken: "valid.google.token", isAccessToken: true };
      const res = GoogleLoginSchema.safeParse(data);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.isAccessToken).toBe(true);
      }
    });

    // --- ❌ Cas Invalides ---
    it("Doit rejeter un token vide", () => {
      const data = { idToken: "" };
      const res = GoogleLoginSchema.safeParse(data);
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un payload sans idToken", () => {
      const data = { isAccessToken: false };
      const res = GoogleLoginSchema.safeParse(data);
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un isAccessToken non booléen", () => {
      const data = { idToken: "valid.google.token", isAccessToken: "oui" };
      const res = GoogleLoginSchema.safeParse(data);
      expect(res.success).toBe(false);
    });
  });
});
