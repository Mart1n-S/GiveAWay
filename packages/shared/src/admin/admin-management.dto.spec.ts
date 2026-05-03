import { AdminRole } from "./admin.enums";
import {
  CreateAdminSchema,
  UpdateAdminSchema,
} from "./admin-management.dto";

describe("Admin management DTOs", () => {
  const validCreate = {
    email: "new.admin@gmail.com",
    firstName: "Marie",
    lastName: "Dupont",
    role: AdminRole.ADMIN,
  };

  describe("CreateAdminSchema", () => {
    it("Doit valider une création correcte", () => {
      const res = CreateAdminSchema.safeParse(validCreate);
      expect(res.success).toBe(true);
    });

    it("Doit normaliser l'email", () => {
      const res = CreateAdminSchema.safeParse({
        ...validCreate,
        email: "  Marie.DUPONT@Gmail.com ",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.email).toBe("marie.dupont@gmail.com");
      }
    });

    it("Doit accepter SUPER_ADMIN", () => {
      const res = CreateAdminSchema.safeParse({
        ...validCreate,
        role: AdminRole.SUPER_ADMIN,
      });
      expect(res.success).toBe(true);
    });

    it("Doit rejeter un email mal formé", () => {
      const res = CreateAdminSchema.safeParse({
        ...validCreate,
        email: "pas-un-email",
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un prénom trop court", () => {
      const res = CreateAdminSchema.safeParse({ ...validCreate, firstName: "A" });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un nom avec caractères interdits", () => {
      const res = CreateAdminSchema.safeParse({
        ...validCreate,
        lastName: "Dupont<script>",
      });
      expect(res.success).toBe(false);
    });

    it("Doit accepter les apostrophes et tirets dans les noms", () => {
      const res = CreateAdminSchema.safeParse({
        ...validCreate,
        firstName: "Jean-Pierre",
        lastName: "O'Connor",
      });
      expect(res.success).toBe(true);
    });

    it("Doit rejeter un rôle inconnu", () => {
      const res = CreateAdminSchema.safeParse({ ...validCreate, role: "OTHER" });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter si un champ obligatoire manque", () => {
      const { email: _email, ...rest } = validCreate;
      void _email;
      const res = CreateAdminSchema.safeParse(rest);
      expect(res.success).toBe(false);
    });
  });

  describe("UpdateAdminSchema", () => {
    it("Doit accepter un objet vide (toutes les props optionnelles)", () => {
      const res = UpdateAdminSchema.safeParse({});
      expect(res.success).toBe(true);
    });

    it("Doit valider une mise à jour partielle", () => {
      const res = UpdateAdminSchema.safeParse({
        firstName: "Alice",
        role: AdminRole.SUPER_ADMIN,
      });
      expect(res.success).toBe(true);
    });

    it("Doit rejeter un email invalide quand fourni", () => {
      const res = UpdateAdminSchema.safeParse({ email: "not-mail" });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un nom trop long", () => {
      const res = UpdateAdminSchema.safeParse({ lastName: "A".repeat(51) });
      expect(res.success).toBe(false);
    });
  });
});
