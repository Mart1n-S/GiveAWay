import { AddressSchema } from "./address.dto";

describe("AddressSchema", () => {
  // -------------------------------------------------------------------------
  // ✅ CAS VALIDES (Happy Path & Sanitization)
  // -------------------------------------------------------------------------
  describe("Cas Valides", () => {
    it("Doit accepter une adresse complète et valide", () => {
      const input = {
        street: "10 rue de la Paix",
        postalCode: "75001",
        city: "Paris",
        latitude: 48.8566,
        longitude: 2.3522,
      };
      const result = AddressSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.latitude).toBe(48.8566);
        expect(result.data.longitude).toBe(2.3522);
      }
    });

    it("Doit accepter une adresse SANS coordonnées (optionnelles)", () => {
      const input = {
        street: "10 rue de la Paix",
        postalCode: "75001",
        city: "Paris",
      };
      const result = AddressSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("Doit nettoyer les espaces (trim) pour rue, ville et code postal", () => {
      const input = {
        street: "  10 rue de la Paix  ",
        postalCode: " 75001 ",
        city: "  Paris  ",
      };
      const result = AddressSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.street).toBe("10 rue de la Paix");
        expect(result.data.postalCode).toBe("75001");
        expect(result.data.city).toBe("Paris");
      }
    });
  });

  // -------------------------------------------------------------------------
  // 🔄 LOGIQUE DE TRANSFORMATION (Coordonnées partielles)
  // -------------------------------------------------------------------------
  describe("Transform Logic (Coordonnées)", () => {
    it("Doit mettre latitude ET longitude à undefined si SEULEMENT latitude est fournie", () => {
      const input = {
        street: "Rue Test",
        postalCode: "12345",
        city: "TestCity",
        latitude: 45.0,
        // Pas de longitude
      };
      const result = AddressSchema.safeParse(input);

      expect(result.success).toBe(true); // C'est valide, mais transformé
      if (result.success) {
        expect(result.data.latitude).toBeUndefined();
        expect(result.data.longitude).toBeUndefined();
      }
    });

    it("Doit mettre latitude ET longitude à undefined si SEULEMENT longitude est fournie", () => {
      const input = {
        street: "Rue Test",
        postalCode: "12345",
        city: "TestCity",
        longitude: 2.0,
        // Pas de latitude
      };
      const result = AddressSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.latitude).toBeUndefined();
        expect(result.data.longitude).toBeUndefined();
      }
    });
  });

  // -------------------------------------------------------------------------
  // ❌ CAS INVALIDES (Validation Errors)
  // -------------------------------------------------------------------------
  describe("Cas Invalides", () => {
    // --- Code Postal ---
    it("Doit rejeter un code postal qui n'a pas 5 chiffres", () => {
      const inputs = ["750", "750012", "abcde", "7500a"];
      inputs.forEach((cp) => {
        const result = AddressSchema.safeParse({
          street: "Rue",
          postalCode: cp,
          city: "Paris",
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("5 chiffres");
        }
      });
    });

    // --- Rue ---
    it("Doit rejeter une rue trop courte (<3)", () => {
      const result = AddressSchema.safeParse({
        street: "A",
        postalCode: "75001",
        city: "Paris",
      });
      expect(result.success).toBe(false);
    });

    it("Doit rejeter une injection HTML dans la rue", () => {
      const result = AddressSchema.safeParse({
        street: "<script>",
        postalCode: "75001",
        city: "Paris",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("interdits");
      }
    });

    // --- Ville ---
    it("Doit rejeter une ville trop courte (<2)", () => {
      const result = AddressSchema.safeParse({
        street: "Rue de la Paix",
        postalCode: "75001",
        city: "A",
      });
      expect(result.success).toBe(false);
    });

    it("Doit rejeter une injection HTML dans la ville", () => {
      const result = AddressSchema.safeParse({
        street: "Rue de la Paix",
        postalCode: "75001",
        city: "<b>Paris</b>",
      });
      expect(result.success).toBe(false);
    });

    // --- Coordonnées (Limites géographiques) ---
    it("Doit rejeter une latitude invalide (<-90 ou >90)", () => {
      const inputLow = {
        street: "R",
        postalCode: "12345",
        city: "C",
        latitude: -91,
        longitude: 0,
      };
      const inputHigh = {
        street: "R",
        postalCode: "12345",
        city: "C",
        latitude: 91,
        longitude: 0,
      };

      expect(AddressSchema.safeParse(inputLow).success).toBe(false);
      expect(AddressSchema.safeParse(inputHigh).success).toBe(false);
    });

    it("Doit rejeter une longitude invalide (<-180 ou >180)", () => {
      const inputLow = {
        street: "R",
        postalCode: "12345",
        city: "C",
        latitude: 0,
        longitude: -181,
      };
      const inputHigh = {
        street: "R",
        postalCode: "12345",
        city: "C",
        latitude: 0,
        longitude: 181,
      };

      expect(AddressSchema.safeParse(inputLow).success).toBe(false);
      expect(AddressSchema.safeParse(inputHigh).success).toBe(false);
    });

    // -------------------------------------------------------------------------
    // 🛡️ CAS VICIEUX (Edge Cases)
    // -------------------------------------------------------------------------
    it("Doit accepter les coordonnées 0,0 (L'équateur et le méridien de Greenwich)", () => {
      // Le piège classique : 0 est "falsy" en JS. Il faut vérifier qu'on ne le supprime pas.
      const input = {
        street: "Null Island",
        postalCode: "00000",
        city: "Ocean",
        latitude: 0,
        longitude: 0,
      };
      const result = AddressSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.latitude).toBe(0);
        expect(result.data.longitude).toBe(0);
      }
    });

    it("Doit rejeter des types incorrects (ex: number au lieu de string)", () => {
      // Zod doit bloquer si j'envoie un code postal sous forme de nombre
      const input = {
        street: "Rue",
        postalCode: 75001,
        city: "Paris",
      };
      const result = AddressSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Le message d'erreur par défaut de Zod pour un mauvais type
        expect(result.error.issues[0].message).toContain(
          "expected string, received number"
        );
      }
    });
  });
});
