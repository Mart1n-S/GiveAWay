import type { AssociationDto, AssociationDocumentDto } from "./association.dto";
import { AssociationRole, AssociationStatus } from "../user/user.enums";
import type { AssociationMemberDto } from "./association-member.dto";

describe("AssociationDocumentDto", () => {
  // ----------------------------------------------------------------
  // ✅ Structure du document justificatif
  // ----------------------------------------------------------------
  describe("Structure du DTO", () => {
    it("Doit accepter un document valide", () => {
      const doc: AssociationDocumentDto = {
        id: 1,
        fileUrl: "https://cdn.example.com/docs/statuts.pdf",
        type: "STATUTS",
        createdAt: new Date("2024-01-01T00:00:00Z"),
      };

      expect(doc.id).toBe(1);
      expect(doc.fileUrl).toBe("https://cdn.example.com/docs/statuts.pdf");
      expect(doc.type).toBe("STATUTS");
      expect(doc.createdAt).toBeInstanceOf(Date);
    });

    it("Doit accepter createdAt sous forme de string ISO", () => {
      const doc: AssociationDocumentDto = {
        id: 2,
        fileUrl: "https://cdn.example.com/docs/recepisse.pdf",
        type: "RECEPISSE",
        createdAt: "2024-06-15T12:00:00.000Z",
      };

      expect(typeof doc.createdAt).toBe("string");
    });
  });
});

describe("AssociationDto", () => {
  const baseMember: AssociationMemberDto = {
    id: 1,
    userId: 10,
    firstName: "Jean",
    lastName: "Dupont",
    email: "jean@example.com",
    profilePicture: null,
    role: AssociationRole.OWNER,
    createdAt: new Date(),
  };

  const baseDoc: AssociationDocumentDto = {
    id: 1,
    fileUrl: "https://cdn.example.com/docs/statuts.pdf",
    type: "STATUTS",
    createdAt: new Date(),
  };

  // ----------------------------------------------------------------
  // ✅ Association complète avec tous les champs renseignés
  // ----------------------------------------------------------------
  describe("Structure complète", () => {
    it("Doit accepter une association avec tous les champs renseignés", () => {
      const assoc: AssociationDto = {
        id: 1,
        name: "Croix-Rouge Française",
        rna: "W751234567",
        siret: "77567227200016",
        object: "Aide humanitaire et urgences",
        legalStatus: "Association loi 1901",
        phone: "0140960600",
        website: "https://www.croix-rouge.fr",
        description: "La Croix-Rouge française est une association humanitaire.",
        logoUrl: "https://cdn.example.com/logos/croix-rouge.png",
        status: AssociationStatus.VALIDATED,
        requiresManualReview: false,
        rejectionReason: null,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-06-01T00:00:00Z"),
        address: {
          street: "98 Rue Didot",
          city: "Paris",
          postalCode: "75014",
          country: "France",
          latitude: 48.8264,
          longitude: 2.3212,
        },
        members: [baseMember],
        documents: [baseDoc],
      };

      expect(assoc.id).toBe(1);
      expect(assoc.name).toBe("Croix-Rouge Française");
      expect(assoc.status).toBe(AssociationStatus.VALIDATED);
      expect(assoc.members).toHaveLength(1);
      expect(assoc.documents).toHaveLength(1);
      expect(assoc.address).not.toBeNull();
    });
  });

  // ----------------------------------------------------------------
  // ✅ Association avec champs optionnels à null
  // ----------------------------------------------------------------
  describe("Champs optionnels à null", () => {
    it("Doit accepter une association avec tous les champs nullables à null", () => {
      const assoc: AssociationDto = {
        id: 2,
        name: "Nouvelle Association",
        rna: null,
        siret: null,
        object: null,
        legalStatus: null,
        phone: null,
        website: null,
        description: null,
        logoUrl: null,
        status: AssociationStatus.PENDING,
        requiresManualReview: true,
        rejectionReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        address: null,
        members: [],
        documents: [],
      };

      expect(assoc.rna).toBeNull();
      expect(assoc.siret).toBeNull();
      expect(assoc.logoUrl).toBeNull();
      expect(assoc.address).toBeNull();
      expect(assoc.members).toHaveLength(0);
      expect(assoc.documents).toHaveLength(0);
    });
  });

  // ----------------------------------------------------------------
  // ✅ Statuts de l'association
  // ----------------------------------------------------------------
  describe("Statuts (AssociationStatus)", () => {
    it.each([
      [AssociationStatus.PENDING],
      [AssociationStatus.VALIDATED],
      [AssociationStatus.REJECTED],
      [AssociationStatus.SUSPENDED],
    ])("Doit accepter le statut %s", (status) => {
      const assoc: AssociationDto = {
        id: 1,
        name: "Test Asso",
        rna: null,
        siret: null,
        object: null,
        legalStatus: null,
        phone: null,
        website: null,
        description: null,
        logoUrl: null,
        status,
        requiresManualReview: false,
        rejectionReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        address: null,
        members: [],
        documents: [],
      };

      expect(assoc.status).toBe(status);
    });
  });

  // ----------------------------------------------------------------
  // ✅ Association rejetée avec raison
  // ----------------------------------------------------------------
  describe("Association rejetée", () => {
    it("Doit accepter un rejectionReason non-null pour une association rejetée", () => {
      const assoc: AssociationDto = {
        id: 3,
        name: "Asso Rejetée",
        rna: null,
        siret: null,
        object: null,
        legalStatus: null,
        phone: null,
        website: null,
        description: null,
        logoUrl: null,
        status: AssociationStatus.REJECTED,
        requiresManualReview: false,
        rejectionReason: "Documents insuffisants",
        createdAt: new Date(),
        updatedAt: new Date(),
        address: null,
        members: [],
        documents: [],
      };

      expect(assoc.status).toBe(AssociationStatus.REJECTED);
      expect(assoc.rejectionReason).toBe("Documents insuffisants");
    });
  });

  // ----------------------------------------------------------------
  // ✅ Association avec plusieurs membres et documents
  // ----------------------------------------------------------------
  describe("Collections imbriquées", () => {
    it("Doit accepter plusieurs membres avec des rôles différents", () => {
      const members: AssociationMemberDto[] = [
        { ...baseMember, id: 1, role: AssociationRole.OWNER },
        { ...baseMember, id: 2, userId: 11, role: AssociationRole.ADMIN, email: "admin@example.com" },
        { ...baseMember, id: 3, userId: 12, role: AssociationRole.EDITOR, email: "editor@example.com" },
      ];

      const assoc: AssociationDto = {
        id: 4,
        name: "Grande Association",
        rna: "W751111111",
        siret: null,
        object: null,
        legalStatus: null,
        phone: null,
        website: null,
        description: null,
        logoUrl: null,
        status: AssociationStatus.VALIDATED,
        requiresManualReview: false,
        rejectionReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        address: null,
        members,
        documents: [baseDoc],
      };

      expect(assoc.members).toHaveLength(3);
      expect(assoc.members[0].role).toBe(AssociationRole.OWNER);
      expect(assoc.members[1].role).toBe(AssociationRole.ADMIN);
      expect(assoc.members[2].role).toBe(AssociationRole.EDITOR);
    });
  });
});
