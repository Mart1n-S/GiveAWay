import type {
  AssociationPublicItem,
  AssociationPublicAddress,
  AssociationPublicProfile,
  AssociationPublicListResponse,
} from "./association-public.dto";

// ================================================================
// AssociationPublicItem
// ================================================================
describe("AssociationPublicItem", () => {
  describe("Structure du DTO", () => {
    it("Doit accepter un item avec tous les champs renseignés", () => {
      const item: AssociationPublicItem = {
        id: 1,
        name: "Croix-Rouge Paris",
        description: "Association humanitaire nationale.",
        logoUrl: "https://cdn.example.com/logo.png",
        website: "https://croix-rouge.fr",
        category: "Humanitaire",
        city: "Paris",
        activeMissionsCount: 5,
      };

      expect(item.id).toBe(1);
      expect(item.name).toBe("Croix-Rouge Paris");
      expect(item.category).toBe("Humanitaire");
      expect(item.activeMissionsCount).toBe(5);
    });

    it("Doit accepter un item avec les champs optionnels à null", () => {
      const item: AssociationPublicItem = {
        id: 2,
        name: "Asso locale",
        description: null,
        logoUrl: null,
        website: null,
        category: null,
        city: null,
        activeMissionsCount: 0,
      };

      expect(item.description).toBeNull();
      expect(item.logoUrl).toBeNull();
      expect(item.website).toBeNull();
      expect(item.category).toBeNull();
      expect(item.city).toBeNull();
      expect(item.activeMissionsCount).toBe(0);
    });
  });
});

// ================================================================
// AssociationPublicAddress
// ================================================================
describe("AssociationPublicAddress", () => {
  it("Doit accepter une adresse complète avec coordonnées", () => {
    const address: AssociationPublicAddress = {
      street: "10 rue de la Paix",
      postalCode: "75001",
      city: "Paris",
      latitude: 48.8584,
      longitude: 2.2945,
    };

    expect(address.street).toBe("10 rue de la Paix");
    expect(address.postalCode).toBe("75001");
    expect(address.latitude).toBe(48.8584);
    expect(address.longitude).toBe(2.2945);
  });

  it("Doit accepter une adresse sans coordonnées (null)", () => {
    const address: AssociationPublicAddress = {
      street: "5 avenue de la Liberté",
      postalCode: "69001",
      city: "Lyon",
      latitude: null,
      longitude: null,
    };

    expect(address.latitude).toBeNull();
    expect(address.longitude).toBeNull();
  });
});

// ================================================================
// AssociationPublicProfile
// ================================================================
describe("AssociationPublicProfile", () => {
  const baseProfile: AssociationPublicProfile = {
    id: 42,
    name: "Les Restos du Cœur",
    description: "Aide alimentaire",
    object: "Objet statutaire",
    legalStatus: "Association loi 1901",
    logoUrl: null,
    website: "https://restosducoeur.org",
    phone: "01 53 32 23 23",
    category: "Aide alimentaire",
    address: {
      street: "42 rue des Acacias",
      postalCode: "75017",
      city: "Paris",
      latitude: 48.88,
      longitude: 2.31,
    },
    activeMissionsCount: 8,
    createdAt: "2024-01-15T10:00:00.000Z",
  };

  it("Doit accepter un profil complet", () => {
    expect(baseProfile.id).toBe(42);
    expect(baseProfile.name).toBe("Les Restos du Cœur");
    expect(baseProfile.activeMissionsCount).toBe(8);
    expect(baseProfile.address?.city).toBe("Paris");
  });

  it("Doit accepter un profil avec les champs optionnels à null", () => {
    const profile: AssociationPublicProfile = {
      ...baseProfile,
      description: null,
      object: null,
      legalStatus: null,
      logoUrl: null,
      website: null,
      phone: null,
      category: null,
      address: null,
    };

    expect(profile.description).toBeNull();
    expect(profile.object).toBeNull();
    expect(profile.legalStatus).toBeNull();
    expect(profile.category).toBeNull();
    expect(profile.address).toBeNull();
  });

  it("Doit accepter createdAt en string ISO ou en objet Date", () => {
    const profileWithString: AssociationPublicProfile = {
      ...baseProfile,
      createdAt: "2024-06-01T00:00:00.000Z",
    };
    const profileWithDate: AssociationPublicProfile = {
      ...baseProfile,
      createdAt: new Date("2024-06-01"),
    };

    expect(typeof profileWithString.createdAt).toBe("string");
    expect(profileWithDate.createdAt).toBeInstanceOf(Date);
  });

  it("Doit exposer activeMissionsCount correctement", () => {
    const profile: AssociationPublicProfile = {
      ...baseProfile,
      activeMissionsCount: 0,
    };

    expect(profile.activeMissionsCount).toBe(0);
  });
});

// ================================================================
// AssociationPublicListResponse
// ================================================================
describe("AssociationPublicListResponse", () => {
  const makeItem = (id: number): AssociationPublicItem => ({
    id,
    name: `Association ${id}`,
    description: null,
    logoUrl: null,
    website: null,
    category: null,
    city: null,
    activeMissionsCount: 0,
  });

  it("Doit accepter une réponse paginée avec plusieurs associations", () => {
    const response: AssociationPublicListResponse = {
      associations: [makeItem(1), makeItem(2), makeItem(3)],
      total: 42,
      page: 1,
      pageSize: 12,
    };

    expect(response.associations).toHaveLength(3);
    expect(response.total).toBe(42);
    expect(response.page).toBe(1);
    expect(response.pageSize).toBe(12);
  });

  it("Doit accepter une réponse vide (aucune association)", () => {
    const response: AssociationPublicListResponse = {
      associations: [],
      total: 0,
      page: 1,
      pageSize: 12,
    };

    expect(response.associations).toHaveLength(0);
    expect(response.total).toBe(0);
  });

  it("Doit correctement représenter une page non-initiale", () => {
    const response: AssociationPublicListResponse = {
      associations: [makeItem(13), makeItem(14)],
      total: 14,
      page: 2,
      pageSize: 12,
    };

    expect(response.page).toBe(2);
    expect(response.associations.length).toBeLessThan(response.pageSize);
  });
});
