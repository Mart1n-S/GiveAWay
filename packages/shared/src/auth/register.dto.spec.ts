import { RegisterSchema } from "./register.dto";

// Données de base valides pour éviter de répéter tout l'objet à chaque test
const validAddress = {
  street: "10 rue de la Paix",
  postalCode: "75000",
  city: "Paris",
  latitude: 48.8566,
  longitude: 2.3522,
};

const validRegisterData = {
  firstName: "Jean",
  lastName: "Dupont",
  email: "jean.dupont@example.com",
  password: "Password123!",
  confirmPassword: "Password123!",
  age: 25,
  acceptTerms: true,
  address: validAddress,
  biography: "Salut, je suis Jean.",
  profilePicture: "https://example.com/avatar.jpg",
};

describe("Register DTOs", () => {
  // ===========================================================================
  // TESTS REGISTER
  // ===========================================================================
  describe("RegisterSchema", () => {
    // --- ✅ Cas Valides ---
    it("Doit valider un utilisateur complet et correct", () => {
      const res = RegisterSchema.safeParse(validRegisterData);
      expect(res.success).toBe(true);
    });

    it("Doit accepter sans champs optionnels (bio, photo)", () => {
      // 1. On crée une copie superficielle (shallow copy)
      const requiredData = { ...validRegisterData };

      // 2. On supprime les clés qu'on ne veut pas
      delete requiredData.biography;
      delete requiredData.profilePicture;

      const res = RegisterSchema.safeParse(requiredData);
      expect(res.success).toBe(true);
    });

    it("Doit nettoyer (trim) le nom, le prénom et la bio", () => {
      const res = RegisterSchema.safeParse({
        ...validRegisterData,
        firstName: "  Jean  ",
        lastName: "  Dupont  ",
        biography: "  Moi  ",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.firstName).toBe("Jean");
        expect(res.data.lastName).toBe("DUPONT");
        expect(res.data.biography).toBe("Moi");
      }
    });

    // --- ❌ Cas Invalides ---
    // --- Validation Prénom / Nom ---
    it("Doit rejeter un prénom trop court (<2)", () => {
      const res = RegisterSchema.safeParse({
        ...validRegisterData,
        firstName: "A",
      });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("trop court");
    });

    it("Doit rejeter un prénom avec injection HTML (<script>)", () => {
      const res = RegisterSchema.safeParse({
        ...validRegisterData,
        firstName: "<script>",
      });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("lettres");
    });

    // --- Validation Age ---
    it("Doit rejeter un mineur (<18)", () => {
      const res = RegisterSchema.safeParse({ ...validRegisterData, age: 17 });
      expect(res.success).toBe(false);
      if (!res.success) expect(res.error.issues[0].message).toContain("18 ans");
    });

    it("Doit rejeter un âge > 100", () => {
      const res = RegisterSchema.safeParse({ ...validRegisterData, age: 101 });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un âge décimal (float)", () => {
      const res = RegisterSchema.safeParse({ ...validRegisterData, age: 25.5 });
      expect(res.success).toBe(false);
      if (!res.success) expect(res.error.issues[0].message).toContain("entier");
    });

    // --- Validation Mot de passe (Regex & Complexité) ---
    it("Doit rejeter un mot de passe trop court (<12)", () => {
      // 11 caractères
      const res = RegisterSchema.safeParse({
        ...validRegisterData,
        password: "Password12!",
        confirmPassword: "Password12!",
      });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("12 caractères");
    });

    it("Doit rejeter sans Majuscule", () => {
      const p = "password123!";
      const res = RegisterSchema.safeParse({
        ...validRegisterData,
        password: p,
        confirmPassword: p,
      });
      expect(res.success).toBe(false);
      // On vérifie que c'est bien le message de regex qui sort
      if (!res.success)
        expect(res.error.issues[0].message).toContain("1 majuscule");
    });

    it("Doit rejeter sans Minuscule", () => {
      const p = "PASSWORD123!";
      const res = RegisterSchema.safeParse({
        ...validRegisterData,
        password: p,
        confirmPassword: p,
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter sans Chiffre", () => {
      const p = "Password!!!!";
      const res = RegisterSchema.safeParse({
        ...validRegisterData,
        password: p,
        confirmPassword: p,
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter sans Caractère Spécial (@$!%*?&)", () => {
      const p = "Password1234";
      const res = RegisterSchema.safeParse({
        ...validRegisterData,
        password: p,
        confirmPassword: p,
      });
      expect(res.success).toBe(false);
    });

    it("Doit accepter # comme caractère spécial", () => {
      const p = "Password123#";
      const res = RegisterSchema.safeParse({
        ...validRegisterData,
        password: p,
        confirmPassword: p,
      });
      expect(res.success).toBe(true);
    });

    // --- Validation Croisée (Confirm Password) ---
    it("Doit rejeter si confirmation différente du mot de passe", () => {
      const res = RegisterSchema.safeParse({
        ...validRegisterData,
        password: "Password123!",
        confirmPassword: "Password1234!", // Différent
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe(
          "Les mots de passe ne correspondent pas",
        );
        expect(res.error.issues[0].path).toContain("confirmPassword");
      }
    });

    // --- Conditions Générales ---
    it("Doit rejeter si acceptTerms est false", () => {
      const res = RegisterSchema.safeParse({
        ...validRegisterData,
        acceptTerms: false,
      });
      expect(res.success).toBe(false);
    });

    // --- Biographie (HTML Check) ---
    it("Doit rejeter du HTML dans la bio", () => {
      const res = RegisterSchema.safeParse({
        ...validRegisterData,
        biography: "Hello <br> world",
      });
      expect(res.success).toBe(false);
      if (!res.success)
        expect(res.error.issues[0].message).toContain("interdits");
    });

    // --- Profile Picture ---
    it("Doit accepter une chaîne arbitraire pour profilePicture", () => {
      const res = RegisterSchema.safeParse({
        ...validRegisterData,
        profilePicture: "not-an-url",
      });

      expect(res.success).toBe(true);
    });

    it("Doit rejeter une inscription si l'adresse est invalide (Propagation)", () => {
      // On teste si Zod "descend" bien valider l'objet address imbriqué
      const res = RegisterSchema.safeParse({
        ...validRegisterData,
        address: {
          ...validAddress,
          postalCode: "BAD-CODE", // Invalide selon AddressSchema
        },
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        // L'erreur doit venir du champ address.postalCode
        expect(res.error.issues[0].path).toContain("address");
        expect(res.error.issues[0].path).toContain("postalCode");
      }
    });

    it("Doit rejeter du HTML aussi dans le nom de famille", () => {
      const res = RegisterSchema.safeParse({
        ...validRegisterData,
        lastName: "Dupont<script>",
      });
      expect(res.success).toBe(false);
    });
  });
});
