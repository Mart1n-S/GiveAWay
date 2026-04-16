import { UpdateAssociationSchema } from "./update-association.dto";

const validAddress = {
  street: "10 rue de la Paix",
  postalCode: "75001",
  city: "Paris",
};

describe("UpdateAssociationSchema", () => {
  // ----------------------------------------------------------------
  // ✅ Cas valides
  // ----------------------------------------------------------------
  describe("Cas valides", () => {
    it("Doit valider un objet vide (tous les champs sont optionnels)", () => {
      const res = UpdateAssociationSchema.safeParse({});
      expect(res.success).toBe(true);
    });

    it("Doit valider une mise à jour de nom uniquement", () => {
      const res = UpdateAssociationSchema.safeParse({
        name: "Nouvelle Association",
      });
      expect(res.success).toBe(true);
      if (res.success) expect(res.data.name).toBe("Nouvelle Association");
    });

    it("Doit valider avec tous les champs scalaires renseignés", () => {
      const res = UpdateAssociationSchema.safeParse({
        name: "Les Amis du Quartier",
        rna: "W123456789",
        siret: "12345678901234",
        object: "Aide aux personnes en difficulté.",
        legalStatus: "Association loi 1901",
        phone: "0123456789",
        website: "https://association.fr",
        description: "Une belle association.",
        logoUrl: "uploads/logo.png",
        documentUrls: ["uploads/statuts.pdf"],
      });
      expect(res.success).toBe(true);
    });

    it("Doit valider avec une adresse complète", () => {
      const res = UpdateAssociationSchema.safeParse({
        name: "Association Test",
        address: validAddress,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.address?.street).toBe("10 rue de la Paix");
        expect(res.data.address?.postalCode).toBe("75001");
        expect(res.data.address?.city).toBe("Paris");
      }
    });

    it("Doit valider une adresse sérialisée en JSON (multipart)", () => {
      const res = UpdateAssociationSchema.safeParse({
        address: JSON.stringify(validAddress),
      });
      expect(res.success).toBe(true);
      if (res.success) expect(res.data.address?.city).toBe("Paris");
    });

    it("Doit accepter phone et website vides (champs vidés intentionnellement)", () => {
      const res = UpdateAssociationSchema.safeParse({ phone: "", website: "" });
      expect(res.success).toBe(true);
    });

    it("Doit accepter rna vide si siret est renseigné", () => {
      const res = UpdateAssociationSchema.safeParse({
        rna: "",
        siret: "12345678901234",
      });
      expect(res.success).toBe(true);
    });

    it("Doit accepter siret vide si rna est renseigné", () => {
      const res = UpdateAssociationSchema.safeParse({
        rna: "W123456789",
        siret: "",
      });
      expect(res.success).toBe(true);
    });

    it("Doit trimmer les champs texte", () => {
      const res = UpdateAssociationSchema.safeParse({
        name: "  Mon Association  ",
      });
      expect(res.success).toBe(true);
      if (res.success) expect(res.data.name).toBe("Mon Association");
    });

    it("Doit accepter une adresse avec coordonnées GPS", () => {
      const res = UpdateAssociationSchema.safeParse({
        address: { ...validAddress, latitude: 48.85, longitude: 2.35 },
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.address?.latitude).toBe(48.85);
        expect(res.data.address?.longitude).toBe(2.35);
      }
    });
  });

  // ----------------------------------------------------------------
  // ❌ Validation — nom
  // ----------------------------------------------------------------
  describe("Validation — nom", () => {
    it("Doit rejeter un nom trop court (<2 caractères)", () => {
      const res = UpdateAssociationSchema.safeParse({ name: "A" });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("trop court");
    });

    it("Doit rejeter un nom dépassant 255 caractères", () => {
      const res = UpdateAssociationSchema.safeParse({
        name: "A".repeat(256),
      });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("255");
    });

    it("Doit rejeter du HTML dans le nom", () => {
      const res = UpdateAssociationSchema.safeParse({
        name: "<script>XSS</script>",
      });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("interdits");
    });
  });

  // ----------------------------------------------------------------
  // ✅ RNA et SIRET — champs en lecture seule (non modifiables via PATCH)
  // ----------------------------------------------------------------
  describe("RNA et SIRET (champs en lecture seule)", () => {
    it("Doit ignorer silencieusement un RNA soumis (champ inconnu du schéma)", () => {
      // RNA est readonly — UpdateAssociationSchema ne le valide pas.
      // Zod strip les champs inconnus par défaut → succès sans erreur.
      const res = UpdateAssociationSchema.safeParse({ rna: "W123456789" });
      expect(res.success).toBe(true);
      if (res.success) {
        expect((res.data as any).rna).toBeUndefined();
      }
    });

    it("Doit ignorer silencieusement un SIRET soumis (champ inconnu du schéma)", () => {
      // SIRET est readonly — UpdateAssociationSchema ne le valide pas.
      const res = UpdateAssociationSchema.safeParse({ siret: "77567227200016" });
      expect(res.success).toBe(true);
      if (res.success) {
        expect((res.data as any).siret).toBeUndefined();
      }
    });

    it("Doit ignorer RNA et SIRET même s'ils sont tous les deux soumis", () => {
      const res = UpdateAssociationSchema.safeParse({
        rna: "W123456789",
        siret: "77567227200016",
        name: "Mon Association",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect((res.data as any).rna).toBeUndefined();
        expect((res.data as any).siret).toBeUndefined();
        expect(res.data.name).toBe("Mon Association");
      }
    });
  });

  // ----------------------------------------------------------------
  // ❌ Validation — téléphone
  // ----------------------------------------------------------------
  describe("Validation — téléphone", () => {
    it("Doit rejeter un téléphone invalide (lettres)", () => {
      const res = UpdateAssociationSchema.safeParse({ phone: "abc" });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("téléphone");
    });

    it("Doit rejeter un téléphone ne commençant pas par 0", () => {
      const res = UpdateAssociationSchema.safeParse({ phone: "1234567890" });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un téléphone de moins de 10 chiffres", () => {
      const res = UpdateAssociationSchema.safeParse({ phone: "012345678" });
      expect(res.success).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // ❌ Validation — site web
  // ----------------------------------------------------------------
  describe("Validation — site web", () => {
    it("Doit rejeter une URL sans protocole", () => {
      const res = UpdateAssociationSchema.safeParse({
        website: "association.fr",
      });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("site web");
    });

    it("Doit rejeter une chaîne arbitraire non-URL", () => {
      const res = UpdateAssociationSchema.safeParse({ website: "pas une url" });
      expect(res.success).toBe(false);
    });

    it("Doit accepter une URL https valide", () => {
      const res = UpdateAssociationSchema.safeParse({
        website: "https://association.fr",
      });
      expect(res.success).toBe(true);
    });

    it("Doit accepter une URL http valide", () => {
      const res = UpdateAssociationSchema.safeParse({
        website: "http://association.fr",
      });
      expect(res.success).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // ❌ Validation — description et object
  // ----------------------------------------------------------------
  describe("Validation — description et objet", () => {
    it("Doit rejeter une description dépassant 1000 caractères", () => {
      const res = UpdateAssociationSchema.safeParse({
        description: "a".repeat(1001),
      });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("1000");
    });

    it("Doit rejeter du HTML dans la description", () => {
      const res = UpdateAssociationSchema.safeParse({
        description: "Hello <b>world</b>",
      });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("interdits");
    });

    it("Doit rejeter un objet dépassant 500 caractères", () => {
      const res = UpdateAssociationSchema.safeParse({
        object: "b".repeat(501),
      });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("500");
    });

    it("Doit rejeter du HTML dans l'objet", () => {
      const res = UpdateAssociationSchema.safeParse({
        object: "<script>bad</script>",
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter du HTML dans le statut juridique", () => {
      const res = UpdateAssociationSchema.safeParse({
        legalStatus: "Loi <1901>",
      });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("interdits");
    });
  });

  // ----------------------------------------------------------------
  // ❌ Validation — adresse
  // ----------------------------------------------------------------
  describe("Validation — adresse", () => {
    it("Doit rejeter une adresse avec un code postal invalide", () => {
      const res = UpdateAssociationSchema.safeParse({
        address: { ...validAddress, postalCode: "ABC" },
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        const paths = res.error.issues.map((i) => i.path.join("."));
        expect(paths.some((p) => p.includes("postalCode"))).toBe(true);
      }
    });

    it("Doit rejeter une adresse sans rue", () => {
      const res = UpdateAssociationSchema.safeParse({
        address: { postalCode: "75001", city: "Paris" },
      });
      expect(res.success).toBe(false);
    });

    it("Doit ignorer latitude si longitude est absente (les deux mis à undefined)", () => {
      const res = UpdateAssociationSchema.safeParse({
        address: { ...validAddress, latitude: 48.85 },
      });
      // Le schéma ne rejette pas : il efface silencieusement lat/lon incomplets
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.address?.latitude).toBeUndefined();
        expect(res.data.address?.longitude).toBeUndefined();
      }
    });
  });
});
