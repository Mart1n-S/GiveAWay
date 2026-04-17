import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AssociationVerificationService } from './association-verification.service';
import { RegisterAssociationDto } from '@repo/shared';

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
const makeDto = (
  overrides: Partial<RegisterAssociationDto> = {},
): RegisterAssociationDto =>
  ({
    name: 'Les Amis du Quartier',
    email: 'contact@asso.fr',
    rna: 'W123456789',
    object: 'Objet statutaire',
    legalStatus: 'Association loi 1901',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    address: {
      street: '10 rue de la Paix',
      postalCode: '75001',
      city: 'Paris',
    },
    ...overrides,
  }) as RegisterAssociationDto;

const makeApiResponse = (overrides: Record<string, unknown> = {}) => ({
  total_results: 1,
  results: [
    {
      nom_raison_sociale: 'Les Amis du Quartier',
      etat_administratif: 'A',
      siege: { code_postal: '75001' },
      complements: {
        est_association: true,
        identifiant_association: 'W123456789',
      },
      ...overrides,
    },
  ],
});

const mockConfigService = { get: jest.fn() };

describe('AssociationVerificationService', () => {
  let service: AssociationVerificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssociationVerificationService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AssociationVerificationService>(
      AssociationVerificationService,
    );
    jest.clearAllMocks();
    // Fournir l'URL par défaut
    mockConfigService.get.mockReturnValue(
      'https://api.example.fr/associations',
    );
  });

  // ----------------------------------------------------------------
  // Cas : pas d'identifiant
  // ----------------------------------------------------------------
  describe('Sans identifiant (ni RNA ni SIRET)', () => {
    it('✅ Doit retourner requiresManualReview si ni RNA ni SIRET', async () => {
      const result = await service.verifyAssociation(
        makeDto({ rna: undefined, siret: undefined }),
      );
      expect(result.requiresManualReview).toBe(true);
      expect(result.exists).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // Cas : URL absente
  // ----------------------------------------------------------------
  describe('Sans URL configurée', () => {
    it('✅ Doit retourner requiresManualReview si ASSOCIATION_API_URL est absent', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      const result = await service.verifyAssociation(makeDto());
      expect(result.requiresManualReview).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // Cas : erreurs réseau / API
  // ----------------------------------------------------------------
  describe('Erreurs réseau et HTTP', () => {
    it('✅ Doit retourner requiresManualReview si fetch lance une exception', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network Error'));
      const result = await service.verifyAssociation(makeDto());
      expect(result.requiresManualReview).toBe(true);
    });

    it("✅ Doit retourner requiresManualReview si l'API retourne un statut non-OK", async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue({ ok: false, status: 500 } as Response);
      const result = await service.verifyAssociation(makeDto());
      expect(result.requiresManualReview).toBe(true);
    });

    it('✅ Doit retourner requiresManualReview si total_results vaut 0', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => ({ total_results: 0, results: [] }),
      } as unknown as Response);
      const result = await service.verifyAssociation(makeDto());
      expect(result.requiresManualReview).toBe(true);
      expect(result.exists).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // Cas : résultat non-association
  // ----------------------------------------------------------------
  describe('Entité trouvée mais pas une association', () => {
    it('✅ Doit retourner requiresManualReview si est_association !== true', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          makeApiResponse({ complements: { est_association: false } }),
      } as unknown as Response);

      const result = await service.verifyAssociation(makeDto());
      expect(result.requiresManualReview).toBe(true);
      expect(result.exists).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // Cas : association fermée
  // ----------------------------------------------------------------
  describe('Association fermée (dissoute)', () => {
    it('❌ Doit bloquer l\'inscription si etat_administratif === "F"', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => makeApiResponse({ etat_administratif: 'F' }),
      } as unknown as Response);

      const result = await service.verifyAssociation(makeDto());
      expect(result.isActive).toBe(false);
      expect(result.requiresManualReview).toBe(false);
      expect(result.rejectionReason).toContain('fermée');
    });
  });

  // ----------------------------------------------------------------
  // Cas : état inconnu
  // ----------------------------------------------------------------
  describe('État administratif inconnu', () => {
    it('✅ Doit retourner requiresManualReview si etat_administratif est inconnu', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => makeApiResponse({ etat_administratif: 'X' }),
      } as unknown as Response);

      const result = await service.verifyAssociation(makeDto());
      expect(result.requiresManualReview).toBe(true);
      expect(result.isActive).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // Cas : association active et cohérente
  // ----------------------------------------------------------------
  describe('Association active et données cohérentes', () => {
    it('✅ Doit retourner isConsistent: true si toutes les données correspondent', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => makeApiResponse(),
      } as unknown as Response);

      const result = await service.verifyAssociation(makeDto());
      expect(result.exists).toBe(true);
      expect(result.isActive).toBe(true);
      expect(result.isConsistent).toBe(true);
      expect(result.requiresManualReview).toBe(false);
      expect(result.rejectionReason).toBeUndefined();
    });

    it('✅ Doit ignorer la casse et les espaces sur le nom', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          makeApiResponse({ nom_raison_sociale: 'les amis du quartier' }),
      } as unknown as Response);

      const result = await service.verifyAssociation(makeDto());
      expect(result.isConsistent).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // Cas : incohérences → revue manuelle (sans blocage)
  // ----------------------------------------------------------------
  describe('Incohérences de données → revue manuelle', () => {
    it('✅ Doit mettre requiresManualReview si le nom ne correspond pas', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          makeApiResponse({ nom_raison_sociale: 'Autre Association' }),
      } as unknown as Response);

      const result = await service.verifyAssociation(makeDto());
      expect(result.requiresManualReview).toBe(true);
      expect(result.isConsistent).toBe(false);
      expect(result.rejectionReason).toBeUndefined();
    });

    it('✅ Doit mettre requiresManualReview si le code postal ne correspond pas', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => makeApiResponse({ siege: { code_postal: '69001' } }),
      } as unknown as Response);

      const result = await service.verifyAssociation(makeDto());
      expect(result.requiresManualReview).toBe(true);
      expect(result.isConsistent).toBe(false);
    });

    it('✅ Doit mettre requiresManualReview si le RNA soumis ne correspond pas', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          makeApiResponse({
            complements: {
              est_association: true,
              identifiant_association: 'W999999999',
            },
          }),
      } as unknown as Response);

      const result = await service.verifyAssociation(makeDto());
      expect(result.requiresManualReview).toBe(true);
      expect(result.isConsistent).toBe(false);
    });

    it('✅ Ne doit pas vérifier le code postal si aucune adresse fournie', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => makeApiResponse(),
      } as unknown as Response);

      const result = await service.verifyAssociation(
        makeDto({ address: undefined }),
      );
      expect(result.isConsistent).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // URL construite correctement
  // ----------------------------------------------------------------
  describe("Construction de l'URL", () => {
    it("✅ Doit appeler l'API avec ?q=<identifiant>", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => makeApiResponse(),
      } as unknown as Response);

      await service.verifyAssociation(makeDto({ rna: 'W123456789' }));

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('?q=W123456789'),
        expect.any(Object),
      );
    });

    it('✅ Doit utiliser le SIRET si pas de RNA', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => makeApiResponse(),
      } as unknown as Response);

      await service.verifyAssociation(
        makeDto({ rna: undefined, siret: '12345678901234' }),
      );

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('12345678901234'),
        expect.any(Object),
      );
    });
  });
});
