import {
  CreateAssociationAdminSchema,
  RejectAssociationSchema,
  RequestDocumentsSchema,
  SuspendAssociationSchema,
  UpdateAssociationAdminSchema,
} from "./admin-association.dto";

describe("Admin association DTOs", () => {
  describe("RejectAssociationSchema", () => {
    it("Doit valider une raison de 10+ caractères", () => {
      const res = RejectAssociationSchema.safeParse({
        reason: "Documents manquants",
      });
      expect(res.success).toBe(true);
    });

    it("Doit rejeter une raison trop courte", () => {
      const res = RejectAssociationSchema.safeParse({ reason: "court" });
      expect(res.success).toBe(false);
    });

    it("Doit trim la raison", () => {
      const res = RejectAssociationSchema.safeParse({
        reason: "   Documents manquants   ",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.reason).toBe("Documents manquants");
      }
    });

    it("Doit rejeter une raison de plus de 2000 caractères", () => {
      const res = RejectAssociationSchema.safeParse({
        reason: "x".repeat(2001),
      });
      expect(res.success).toBe(false);
    });
  });

  describe("SuspendAssociationSchema", () => {
    it("Doit valider une raison correcte", () => {
      const res = SuspendAssociationSchema.safeParse({
        reason: "Activité suspecte signalée",
      });
      expect(res.success).toBe(true);
    });

    it("Doit rejeter une raison trop courte", () => {
      const res = SuspendAssociationSchema.safeParse({ reason: "non" });
      expect(res.success).toBe(false);
    });
  });

  describe("RequestDocumentsSchema", () => {
    it("Doit valider une demande avec un type", () => {
      const res = RequestDocumentsSchema.safeParse({ types: ["STATUTS"] });
      expect(res.success).toBe(true);
    });

    it("Doit valider tous les types", () => {
      const res = RequestDocumentsSchema.safeParse({
        types: ["STATUTS", "RNA_ATTESTATION", "OFFICE_PROOF"],
        message: "Merci de transmettre rapidement",
      });
      expect(res.success).toBe(true);
    });

    it("Doit rejeter une liste de types vide", () => {
      const res = RequestDocumentsSchema.safeParse({ types: [] });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un type inconnu", () => {
      const res = RequestDocumentsSchema.safeParse({ types: ["AUTRE"] });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un message trop long", () => {
      const res = RequestDocumentsSchema.safeParse({
        types: ["STATUTS"],
        message: "x".repeat(2001),
      });
      expect(res.success).toBe(false);
    });
  });

  describe("CreateAssociationAdminSchema", () => {
    const valid = { name: "Croix-Rouge Aix", ownerUserId: 7 };

    it("Doit valider le minimum requis", () => {
      const res = CreateAssociationAdminSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it("Doit coercer ownerUserId fourni en string", () => {
      const res = CreateAssociationAdminSchema.safeParse({
        ...valid,
        ownerUserId: "12",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.ownerUserId).toBe(12);
      }
    });

    it("Doit accepter un website vide", () => {
      const res = CreateAssociationAdminSchema.safeParse({
        ...valid,
        website: "",
      });
      expect(res.success).toBe(true);
    });

    it("Doit accepter un website valide", () => {
      const res = CreateAssociationAdminSchema.safeParse({
        ...valid,
        website: "https://example.org",
      });
      expect(res.success).toBe(true);
    });

    it("Doit rejeter un website mal formé", () => {
      const res = CreateAssociationAdminSchema.safeParse({
        ...valid,
        website: "pas-une-url",
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un nom trop court", () => {
      const res = CreateAssociationAdminSchema.safeParse({ ...valid, name: "A" });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un ownerUserId négatif", () => {
      const res = CreateAssociationAdminSchema.safeParse({
        ...valid,
        ownerUserId: -1,
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter une description trop longue", () => {
      const res = CreateAssociationAdminSchema.safeParse({
        ...valid,
        description: "x".repeat(5001),
      });
      expect(res.success).toBe(false);
    });
  });

  describe("UpdateAssociationAdminSchema", () => {
    it("Doit accepter un objet vide", () => {
      const res = UpdateAssociationAdminSchema.safeParse({});
      expect(res.success).toBe(true);
    });

    it("Doit valider une mise à jour partielle", () => {
      const res = UpdateAssociationAdminSchema.safeParse({
        name: "Nouveau nom",
        phone: "0102030405",
      });
      expect(res.success).toBe(true);
    });

    it("Doit rejeter un categoryId non positif", () => {
      const res = UpdateAssociationAdminSchema.safeParse({ categoryId: 0 });
      expect(res.success).toBe(false);
    });

    it("Doit accepter un website vide ou valide", () => {
      expect(UpdateAssociationAdminSchema.safeParse({ website: "" }).success).toBe(
        true,
      );
      expect(
        UpdateAssociationAdminSchema.safeParse({ website: "https://x.org" }).success,
      ).toBe(true);
    });
  });
});
