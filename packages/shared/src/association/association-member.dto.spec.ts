import type { AssociationMemberDto } from "./association-member.dto";
import { AssociationRole } from "../user/user.enums";

describe("AssociationMemberDto", () => {
  // ----------------------------------------------------------------
  // ✅ Structure complète avec photo de profil
  // ----------------------------------------------------------------
  describe("Structure du DTO", () => {
    it("Doit accepter un membre avec profilePicture non-null", () => {
      const member: AssociationMemberDto = {
        id: 1,
        userId: 42,
        firstName: "Jean",
        lastName: "Dupont",
        email: "jean.dupont@example.com",
        profilePicture: "https://cdn.example.com/avatars/jean.jpg",
        role: AssociationRole.ADMIN,
        createdAt: new Date("2024-01-15T10:00:00Z"),
      };

      expect(member.id).toBe(1);
      expect(member.userId).toBe(42);
      expect(member.firstName).toBe("Jean");
      expect(member.lastName).toBe("Dupont");
      expect(member.email).toBe("jean.dupont@example.com");
      expect(member.profilePicture).toBe("https://cdn.example.com/avatars/jean.jpg");
      expect(member.role).toBe(AssociationRole.ADMIN);
      expect(member.createdAt).toBeInstanceOf(Date);
    });

    it("Doit accepter un membre sans photo de profil (null)", () => {
      const member: AssociationMemberDto = {
        id: 2,
        userId: 99,
        firstName: "Marie",
        lastName: "Martin",
        email: "marie.martin@example.com",
        profilePicture: null,
        role: AssociationRole.EDITOR,
        createdAt: "2024-06-01T00:00:00.000Z",
      };

      expect(member.profilePicture).toBeNull();
      expect(member.role).toBe(AssociationRole.EDITOR);
    });

    it("Doit accepter createdAt sous forme de string ISO", () => {
      const member: AssociationMemberDto = {
        id: 3,
        userId: 10,
        firstName: "Paul",
        lastName: "Bernard",
        email: "paul@example.com",
        profilePicture: null,
        role: AssociationRole.OWNER,
        createdAt: "2024-03-20T08:30:00.000Z",
      };

      expect(typeof member.createdAt).toBe("string");
    });
  });

  // ----------------------------------------------------------------
  // ✅ Rôles disponibles
  // ----------------------------------------------------------------
  describe("Rôles (AssociationRole)", () => {
    it.each([
      [AssociationRole.OWNER, "OWNER"],
      [AssociationRole.ADMIN, "ADMIN"],
      [AssociationRole.EDITOR, "EDITOR"],
    ])("Doit accepter le rôle %s", (role, expected) => {
      const member: AssociationMemberDto = {
        id: 1,
        userId: 1,
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        profilePicture: null,
        role,
        createdAt: new Date(),
      };

      expect(member.role).toBe(expected);
    });
  });

  // ----------------------------------------------------------------
  // ✅ Valeurs limites des identifiants
  // ----------------------------------------------------------------
  describe("Identifiants", () => {
    it("Doit accepter des identifiants à 1 (valeur minimale)", () => {
      const member: AssociationMemberDto = {
        id: 1,
        userId: 1,
        firstName: "A",
        lastName: "B",
        email: "a@b.com",
        profilePicture: null,
        role: AssociationRole.EDITOR,
        createdAt: new Date(),
      };

      expect(member.id).toBe(1);
      expect(member.userId).toBe(1);
    });

    it("Doit pouvoir avoir des identifiants distincts (id ≠ userId)", () => {
      const member: AssociationMemberDto = {
        id: 100,
        userId: 42,
        firstName: "Claire",
        lastName: "Fontaine",
        email: "claire@example.com",
        profilePicture: null,
        role: AssociationRole.ADMIN,
        createdAt: new Date(),
      };

      expect(member.id).not.toBe(member.userId);
    });
  });
});
