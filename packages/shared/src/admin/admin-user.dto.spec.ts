import {
  CreateUserAdminSchema,
  UpdateUserAdminSchema,
  UpdateUserStatusSchema,
  UserListQuerySchema,
} from "./admin-user.dto";

const validAddress = {
  street: "1 rue de la Paix",
  postalCode: "75001",
  city: "Paris",
};

const validCreate = {
  email: "user@gmail.com",
  firstName: "Jean",
  lastName: "Dupont",
  age: 25,
  address: validAddress,
};

describe("Admin user DTOs", () => {
  describe("CreateUserAdminSchema", () => {
    it("Doit valider une création correcte", () => {
      const res = CreateUserAdminSchema.safeParse(validCreate);
      expect(res.success).toBe(true);
    });

    it("Doit normaliser l'email", () => {
      const res = CreateUserAdminSchema.safeParse({
        ...validCreate,
        email: "  Jean.D@Gmail.com  ",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.email).toBe("jean.d@gmail.com");
      }
    });

    it("Doit coercer un âge fourni en string", () => {
      const res = CreateUserAdminSchema.safeParse({
        ...validCreate,
        age: "30",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.age).toBe(30);
      }
    });

    it.each([
      ["mineur", 17],
      ["trop âgé", 101],
      ["négatif", -1],
    ])("Doit rejeter un âge %s", (_label, age) => {
      const res = CreateUserAdminSchema.safeParse({ ...validCreate, age });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un âge non entier", () => {
      const res = CreateUserAdminSchema.safeParse({
        ...validCreate,
        age: 25.5,
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un email mal formé", () => {
      const res = CreateUserAdminSchema.safeParse({
        ...validCreate,
        email: "invalid",
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un prénom contenant des chiffres", () => {
      const res = CreateUserAdminSchema.safeParse({
        ...validCreate,
        firstName: "Jean42",
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter une adresse invalide", () => {
      const res = CreateUserAdminSchema.safeParse({
        ...validCreate,
        address: { ...validAddress, postalCode: "abc" },
      });
      expect(res.success).toBe(false);
    });
  });

  describe("UpdateUserAdminSchema", () => {
    it("Doit accepter un objet vide", () => {
      const res = UpdateUserAdminSchema.safeParse({});
      expect(res.success).toBe(true);
    });

    it("Doit valider une mise à jour partielle", () => {
      const res = UpdateUserAdminSchema.safeParse({ firstName: "Alice" });
      expect(res.success).toBe(true);
    });

    it("Doit accepter une biographie de 1000 caractères", () => {
      const res = UpdateUserAdminSchema.safeParse({
        biography: "A".repeat(1000),
      });
      expect(res.success).toBe(true);
    });

    it("Doit rejeter une biographie de plus de 1000 caractères", () => {
      const res = UpdateUserAdminSchema.safeParse({
        biography: "A".repeat(1001),
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un nom contenant des caractères interdits", () => {
      const res = UpdateUserAdminSchema.safeParse({ lastName: "Dupont<>" });
      expect(res.success).toBe(false);
    });
  });

  describe("UpdateUserStatusSchema", () => {
    it("Doit accepter ACTIVE", () => {
      const res = UpdateUserStatusSchema.safeParse({ status: "ACTIVE" });
      expect(res.success).toBe(true);
    });

    it("Doit accepter SUSPENDED avec une raison", () => {
      const res = UpdateUserStatusSchema.safeParse({
        status: "SUSPENDED",
        reason: "Spam",
      });
      expect(res.success).toBe(true);
    });

    it("Doit rejeter un statut inconnu", () => {
      const res = UpdateUserStatusSchema.safeParse({ status: "DELETED" });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter une raison trop longue", () => {
      const res = UpdateUserStatusSchema.safeParse({
        status: "SUSPENDED",
        reason: "x".repeat(2001),
      });
      expect(res.success).toBe(false);
    });
  });

  describe("UserListQuerySchema", () => {
    it("Doit appliquer les valeurs par défaut", () => {
      const res = UserListQuerySchema.safeParse({});
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.page).toBe(1);
        expect(res.data.limit).toBe(20);
        expect(res.data.sortBy).toBe("createdAt");
        expect(res.data.sortDir).toBe("desc");
      }
    });

    it("Doit coercer page et limit fournis en string", () => {
      const res = UserListQuerySchema.safeParse({ page: "3", limit: "50" });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.page).toBe(3);
        expect(res.data.limit).toBe(50);
      }
    });

    it("Doit rejeter un statut inconnu", () => {
      const res = UserListQuerySchema.safeParse({ status: "OTHER" });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un limit trop grand", () => {
      const res = UserListQuerySchema.safeParse({ limit: 9999 });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un sortBy invalide", () => {
      const res = UserListQuerySchema.safeParse({ sortBy: "id" });
      expect(res.success).toBe(false);
    });
  });
});
