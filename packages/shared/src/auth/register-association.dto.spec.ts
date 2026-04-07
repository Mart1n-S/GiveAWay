import { RegisterAssociationSchema } from "./register-association.dto";

const validAddress = {
  street: "10 rue de la Paix",
  postalCode: "75001",
  city: "Paris",
};

// Données complètes et valides pour les tests
const validData = {
  // Champs utilisateur (owner de l'association)
  firstName: "Marie",
  lastName: "Dupont",
  email: "contact@association.fr",
  password: "Password123!",
  confirmPassword: "Password123!",
  age: 30,
  acceptTerms: true,
  userAddress: validAddress,
  // Champs association
  name: "Les Amis du Quartier",
  rna: "W123456789",
  siret: "12345678901234",
  phone: "0123456789",
  website: "https://association.fr",
  address: validAddress,
  description: "Aide aux personnes en difficulté.",
  object: "Promotion de la solidarité locale.",
  legalStatus: "Association loi 1901",
  logoUrl: "uploads/logo.png",
  documentUrls: ["uploads/statuts.pdf"],
};

describe("RegisterAssociationSchema", () => {
  // ----------------------------------------------------------------
  // ✅ Cas valides
  // ----------------------------------------------------------------
  describe("Cas valides", () => {
    it("Doit valider un dossier complet et correct", () => {
      expect(RegisterAssociationSchema.safeParse(validData).success).toBe(true);
    });

    it("Doit accepter sans champs optionnels (phone, website, description, biography, logo, documents) — RNA seul suffit", () => {
      const minimal = {
        firstName: "Jean",
        lastName: "Dupont",
        email: "mini@asso.fr",
        password: "Password123!",
        confirmPassword: "Password123!",
        age: 25,
        acceptTerms: true,
        userAddress: validAddress,
        address: validAddress,
        name: "Association Minimale",
        rna: "W123456789",
        object: "Objet statutaire.",
        legalStatus: "Association loi 1901",
      };
      expect(RegisterAssociationSchema.safeParse(minimal).success).toBe(true);
    });

    it("Doit accepter phone et website vides (chaînes vides → optionnels)", () => {
      const data = { ...validData, phone: "", website: "" };
      expect(RegisterAssociationSchema.safeParse(data).success).toBe(true);
    });

    it("Doit accepter rna et siret vides si l'autre est renseigné", () => {
      const data = { ...validData, siret: "" };
      expect(RegisterAssociationSchema.safeParse(data).success).toBe(true);
    });

    it("Doit accepter un dossier avec SIRET seul (sans RNA)", () => {
      const { rna: _rna, ...rest } = validData;
      void _rna;
      expect(RegisterAssociationSchema.safeParse(rest).success).toBe(true);
    });

    it("Doit accepter une biographie optionnelle du owner", () => {
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        biography: "Bénévole passionnée depuis 10 ans.",
      });
      expect(res.success).toBe(true);
    });

    it("Doit normaliser l'email en minuscules", () => {
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        email: "CONTACT@ASSOCIATION.FR",
      });
      expect(res.success).toBe(true);
      if (res.success) expect(res.data.email).toBe("contact@association.fr");
    });

    it("Doit capitaliser le prénom (Title Case)", () => {
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        firstName: "jean-pierre",
      });
      expect(res.success).toBe(true);
      if (res.success) expect(res.data.firstName).toBe("Jean-Pierre");
    });

    it("Doit mettre le nom de famille en majuscules", () => {
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        lastName: "dupont",
      });
      expect(res.success).toBe(true);
      if (res.success) expect(res.data.lastName).toBe("DUPONT");
    });

    it("Doit accepter une chaîne arbitraire pour logoUrl (cohérence avec profilePicture)", () => {
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        logoUrl: "not-a-url",
      });
      expect(res.success).toBe(true);
    });

    it("Doit accepter documentUrls comme tableau de chaînes arbitraires", () => {
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        documentUrls: ["path/a.pdf", "path/b.pdf"],
      });
      expect(res.success).toBe(true);
    });

    it("Doit rejeter un dossier sans userAddress (adresse du owner obligatoire)", () => {
      const { userAddress: _ua, ...rest } = validData;
      void _ua;
      const res = RegisterAssociationSchema.safeParse(rest);
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un dossier sans RNA ni SIRET", () => {
      const { rna: _rna, siret: _siret, ...rest } = validData;
      void _rna;
      void _siret;
      const res = RegisterAssociationSchema.safeParse(rest);
      expect(res.success).toBe(false);
      if (!res.success) {
        const msgs = res.error.issues.map((i) => i.message);
        expect(
          msgs.some((m) => m.includes("au moins le RNA ou le SIRET")),
        ).toBe(true);
      }
    });

    it("Doit rejeter une biographie contenant du HTML", () => {
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        biography: "Bio <script>bad</script>",
      });
      expect(res.success).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // ❌ Champs utilisateur (owner)
  // ----------------------------------------------------------------
  describe("Validation — champs utilisateur", () => {
    it("Doit rejeter un prénom trop court (<2 caractères)", () => {
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        firstName: "A",
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un nom trop court (<2 caractères)", () => {
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        lastName: "D",
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un âge inférieur à 18 ans", () => {
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        age: 17,
      });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("18 ans");
    });

    it("Doit rejeter si acceptTerms est false", () => {
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        acceptTerms: false,
      });
      expect(res.success).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // ❌ Nom de l'association
  // ----------------------------------------------------------------
  describe("Validation — nom", () => {
    it("Doit rejeter un nom vide", () => {
      const res = RegisterAssociationSchema.safeParse({ ...validData, name: "" });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un nom trop court (<2 caractères)", () => {
      const res = RegisterAssociationSchema.safeParse({ ...validData, name: "A" });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("trop court");
    });

    it("Doit rejeter du HTML dans le nom", () => {
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        name: "<script>XSS</script>",
      });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("interdits");
    });
  });

  // ----------------------------------------------------------------
  // ❌ RNA / SIRET
  // ----------------------------------------------------------------
  describe("Validation — RNA / SIRET", () => {
    it("Doit rejeter un RNA au mauvais format (sans W)", () => {
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        rna: "123456789",
      });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("RNA");
    });

    it("Doit rejeter un RNA trop court", () => {
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        rna: "W12345",
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un SIRET avec moins de 14 chiffres", () => {
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        siret: "1234567890",
      });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("SIRET");
    });

    it("Doit rejeter un SIRET avec des lettres", () => {
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        siret: "1234567890ABCD",
      });
      expect(res.success).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // ❌ Email / Téléphone / Site
  // ----------------------------------------------------------------
  describe("Validation — email, phone, website", () => {
    it("Doit rejeter un email invalide", () => {
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        email: "pas-un-email",
      });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("email");
    });

    it("Doit rejeter un numéro de téléphone invalide", () => {
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        phone: "abc",
      });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("téléphone");
    });

    it("Doit rejeter un site web sans protocole", () => {
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        website: "association.fr",
      });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("site web");
    });
  });

  // ----------------------------------------------------------------
  // ❌ Description / Objet / Statut juridique
  // ----------------------------------------------------------------
  describe("Validation — description, object, legalStatus", () => {
    it("Doit rejeter une description dépassant 1000 caractères", () => {
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        description: "a".repeat(1001),
      });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("1000");
    });

    it("Doit rejeter du HTML dans la description", () => {
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        description: "Hello <b>world</b>",
      });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("interdits");
    });

    it("Doit rejeter un objet dépassant 500 caractères", () => {
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        object: "b".repeat(501),
      });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("500");
    });

    it("Doit rejeter un objet vide", () => {
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        object: "",
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter du HTML dans le statut juridique", () => {
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        legalStatus: "Loi <1901>",
      });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("interdits");
    });
  });

  // ----------------------------------------------------------------
  // ❌ Mot de passe
  // ----------------------------------------------------------------
  describe("Validation — mot de passe", () => {
    it("Doit rejeter un mot de passe trop court (<12)", () => {
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        password: "Pass1!",
        confirmPassword: "Pass1!",
      });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("12 caractères");
    });

    it("Doit rejeter sans majuscule", () => {
      const p = "password123!";
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        password: p,
        confirmPassword: p,
      });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("majuscule");
    });

    it("Doit rejeter sans chiffre", () => {
      const p = "Password!!!!";
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        password: p,
        confirmPassword: p,
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter sans caractère spécial", () => {
      const p = "Password1234";
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        password: p,
        confirmPassword: p,
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter si la confirmation ne correspond pas", () => {
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        password: "Password123!",
        confirmPassword: "Password456!",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe(
          "Les mots de passe ne correspondent pas",
        );
        expect(res.error.issues[0].path).toContain("confirmPassword");
      }
    });
  });

  // ----------------------------------------------------------------
  // ❌ Adresse (propagation du AddressSchema)
  // ----------------------------------------------------------------
  describe("Validation — adresse de l'association", () => {
    it("Doit rejeter une adresse avec un code postal invalide", () => {
      const res = RegisterAssociationSchema.safeParse({
        ...validData,
        address: { ...validAddress, postalCode: "ABC" },
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].path).toContain("postalCode");
      }
    });
  });
});
