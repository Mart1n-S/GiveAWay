import { DeleteAccountSchema } from "./delete-account.dto";

describe("Delete Account DTOs", () => {
  describe("DeleteAccountSchema", () => {
    // --- ✅ Cas Valides ---
    it("Doit valider avec un mot de passe fourni (compte email/password)", () => {
      const data = { password: "monMotDePasse123" };
      const res = DeleteAccountSchema.safeParse(data);
      expect(res.success).toBe(true);
    });

    it("Doit valider avec confirmation exacte 'SUPPRIMER' (compte Google)", () => {
      const data = { confirmation: "SUPPRIMER" };
      const res = DeleteAccountSchema.safeParse(data);
      expect(res.success).toBe(true);
    });

    it("Doit valider si les deux champs sont fournis simultanément", () => {
      const data = { password: "monMotDePasse", confirmation: "SUPPRIMER" };
      const res = DeleteAccountSchema.safeParse(data);
      expect(res.success).toBe(true);
    });

    // --- ❌ Cas Invalides ---
    it("Doit rejeter si aucun des deux champs n'est fourni", () => {
      const data = {};
      const res = DeleteAccountSchema.safeParse(data);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].path).toContain("confirmation");
        expect(res.error.issues[0].message).toBe(
          "Une confirmation est requise pour supprimer votre compte",
        );
      }
    });

    it("Doit rejeter si password et confirmation sont tous deux vides", () => {
      const data = { password: "", confirmation: "" };
      const res = DeleteAccountSchema.safeParse(data);
      expect(res.success).toBe(false);
    });

    it("Doit rejeter une confirmation différente de 'SUPPRIMER'", () => {
      const data = { confirmation: "supprimer" };
      const res = DeleteAccountSchema.safeParse(data);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe(
          'Veuillez saisir exactement "SUPPRIMER" pour confirmer',
        );
      }
    });

    it("Doit rejeter une confirmation avec des espaces", () => {
      const data = { confirmation: " SUPPRIMER " };
      const res = DeleteAccountSchema.safeParse(data);
      expect(res.success).toBe(false);
    });
  });
});
