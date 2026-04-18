import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AssociationMissionsService } from './association-missions.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import {
  AssociationStatus,
  MissionStatus,
  ActivityType,
} from '../generated/prisma/client';

// ── Helpers fixtures ──────────────────────────────────────────────

const makeMission = (overrides: Partial<any> = {}): any => ({
  id: 1,
  associationId: 10,
  title: 'Mission test',
  description: 'Description de la mission de test.',
  type: ActivityType.MISSION,
  availabilityType: 'REMOTE',
  status: MissionStatus.ACTIVE,
  hasRegistration: true,
  volunteersNeeded: null,
  durationInt: null,
  frequency: null,
  startDate: null,
  endDate: null,
  addressId: null,
  address: null,
  causes: [],
  skills: [],
  volunteerTypes: [],
  publicTypes: [],
  _count: { participants: 0 },
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides,
});

// ── Mock PrismaService ────────────────────────────────────────────

const mockPrisma = {
  association: { findUnique: jest.fn() },
  mission: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  address: { findFirst: jest.fn(), create: jest.fn() },
  missionParticipant: { findMany: jest.fn() },
  skill: { findUnique: jest.fn() },
  cause: { findUnique: jest.fn() },
  publicType: { findUnique: jest.fn() },
  volunteerType: { findUnique: jest.fn() },
  missionSkill: { deleteMany: jest.fn(), createMany: jest.fn() },
  missionCause: { deleteMany: jest.fn(), createMany: jest.fn() },
  missionPublicType: { deleteMany: jest.fn(), createMany: jest.fn() },
  missionVolunteerType: { deleteMany: jest.fn(), createMany: jest.fn() },
  $transaction: jest.fn(),
};

// ── Mock MailService ──────────────────────────────────────────────

const mockMail = {
  sendMissionDeletedEmail: jest.fn().mockResolvedValue(undefined),
  sendMissionUpdatedEmail: jest.fn().mockResolvedValue(undefined),
};

// ── Suite ─────────────────────────────────────────────────────────

describe('AssociationMissionsService', () => {
  let service: AssociationMissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssociationMissionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMail },
      ],
    }).compile();

    service = module.get<AssociationMissionsService>(
      AssociationMissionsService,
    );
    jest.clearAllMocks();
  });

  // ── create ──────────────────────────────────────────────────────
  describe('create', () => {
    const dto: any = {
      title: 'Nouvelle mission',
      description: 'Description suffisamment longue.',
      type: 'MISSION',
      availabilityType: 'REMOTE',
      hasRegistration: true,
    };

    it('✅ crée une mission avec statut ACTIVE', async () => {
      mockPrisma.association.findUnique.mockResolvedValue({
        status: AssociationStatus.VALIDATED,
      });
      mockPrisma.mission.create.mockResolvedValue(
        makeMission({ title: dto.title }),
      );

      const result = await service.create(10, dto);

      expect(mockPrisma.mission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            associationId: 10,
            status: MissionStatus.ACTIVE,
          }),
        }),
      );
      expect(result.id).toBe(1);
    });

    it('✅ retourne le DTO mappé avec les champs attendus', async () => {
      const mission = makeMission({
        title: 'Ma mission',
        causes: [],
        skills: [{ skill: { id: 1, label: 'Jardinage' } }],
        _count: { participants: 3 },
      });
      mockPrisma.association.findUnique.mockResolvedValue({
        status: AssociationStatus.VALIDATED,
      });
      mockPrisma.mission.create.mockResolvedValue(mission);

      const result = await service.create(10, dto);

      expect(result.participantsCount).toBe(3);
      expect(result.skills).toHaveLength(1);
      expect(result.skills[0].label).toBe('Jardinage');
    });

    it("❌ lève NotFoundException si l'association est introuvable", async () => {
      mockPrisma.association.findUnique.mockResolvedValue(null);

      await expect(service.create(99, dto)).rejects.toThrow(NotFoundException);
    });

    it("❌ lève ForbiddenException si l'association est PENDING", async () => {
      mockPrisma.association.findUnique.mockResolvedValue({
        status: AssociationStatus.PENDING,
      });

      await expect(service.create(10, dto)).rejects.toThrow(ForbiddenException);
    });

    it("❌ lève ForbiddenException si l'association est REJECTED", async () => {
      mockPrisma.association.findUnique.mockResolvedValue({
        status: AssociationStatus.REJECTED,
      });

      await expect(service.create(10, dto)).rejects.toThrow(ForbiddenException);
    });

    it('❌ lève UnprocessableEntityException si un skillId est introuvable', async () => {
      mockPrisma.association.findUnique.mockResolvedValue({
        status: AssociationStatus.VALIDATED,
      });
      mockPrisma.skill.findUnique.mockResolvedValue(null);

      await expect(
        service.create(10, { ...dto, skillIds: [999] }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('❌ lève UnprocessableEntityException si un causeId est introuvable', async () => {
      mockPrisma.association.findUnique.mockResolvedValue({
        status: AssociationStatus.VALIDATED,
      });
      mockPrisma.cause.findUnique.mockResolvedValue(null);

      await expect(
        service.create(10, { ...dto, causeIds: [999] }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it("✅ upsert l'adresse si elle est fournie et inexistante en base", async () => {
      const withAddress = {
        ...dto,
        availabilityType: 'ON_SITE',
        address: { street: '1 rue Test', postalCode: '75001', city: 'Paris' },
      };
      mockPrisma.association.findUnique.mockResolvedValue({
        status: AssociationStatus.VALIDATED,
      });
      mockPrisma.address.findFirst.mockResolvedValue(null);
      mockPrisma.address.create.mockResolvedValue({ id: 5 });
      mockPrisma.mission.create.mockResolvedValue(
        makeMission({ addressId: 5 }),
      );

      await service.create(10, withAddress);

      expect(mockPrisma.address.create).toHaveBeenCalled();
      expect(mockPrisma.mission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ addressId: 5 }),
        }),
      );
    });

    it('✅ réutilise une adresse existante sans en créer une nouvelle', async () => {
      const withAddress = {
        ...dto,
        availabilityType: 'ON_SITE',
        address: { street: '1 rue Test', postalCode: '75001', city: 'Paris' },
      };
      mockPrisma.association.findUnique.mockResolvedValue({
        status: AssociationStatus.VALIDATED,
      });
      mockPrisma.address.findFirst.mockResolvedValue({ id: 3 });
      mockPrisma.mission.create.mockResolvedValue(
        makeMission({ addressId: 3 }),
      );

      await service.create(10, withAddress);

      expect(mockPrisma.address.create).not.toHaveBeenCalled();
    });
  });

  // ── getDashboard ─────────────────────────────────────────────────
  describe('getDashboard', () => {
    it("✅ place une mission ACTIVE sans dates dans l'onglet active", async () => {
      const mission = makeMission({ status: MissionStatus.ACTIVE });
      mockPrisma.mission.findMany.mockResolvedValue([mission]);

      const result = await service.getDashboard(10);

      expect(result.missions.active).toHaveLength(1);
      expect(result.counts.active).toBe(1);
      expect(result.missions.upcoming).toHaveLength(0);
      expect(result.missions.past).toHaveLength(0);
      expect(result.missions.archived).toHaveLength(0);
    });

    it("✅ place une mission ARCHIVED dans l'onglet archived", async () => {
      const mission = makeMission({ status: MissionStatus.ARCHIVED });
      mockPrisma.mission.findMany.mockResolvedValue([mission]);

      const result = await service.getDashboard(10);

      expect(result.missions.archived).toHaveLength(1);
      expect(result.counts.archived).toBe(1);
      expect(result.missions.active).toHaveLength(0);
    });

    it('✅ place une mission avec startDate future dans upcoming', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 7);
      const mission = makeMission({
        status: MissionStatus.ACTIVE,
        startDate: futureDate,
      });
      mockPrisma.mission.findMany.mockResolvedValue([mission]);

      const result = await service.getDashboard(10);

      expect(result.missions.upcoming).toHaveLength(1);
      expect(result.counts.upcoming).toBe(1);
    });

    it('✅ place une mission avec endDate passée dans past', async () => {
      const pastDate = new Date(Date.now() - 86400000 * 7);
      const mission = makeMission({
        status: MissionStatus.ACTIVE,
        endDate: pastDate,
      });
      mockPrisma.mission.findMany.mockResolvedValue([mission]);

      const result = await service.getDashboard(10);

      expect(result.missions.past).toHaveLength(1);
      expect(result.counts.past).toBe(1);
    });

    it('✅ retourne un dashboard entièrement vide si aucune mission', async () => {
      mockPrisma.mission.findMany.mockResolvedValue([]);

      const result = await service.getDashboard(10);

      expect(result.counts).toEqual({
        active: 0,
        upcoming: 0,
        past: 0,
        archived: 0,
      });
      expect(result.missions.active).toHaveLength(0);
    });

    it('✅ classe correctement plusieurs missions dans des onglets différents', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 10);
      const pastDate = new Date(Date.now() - 86400000 * 10);
      mockPrisma.mission.findMany.mockResolvedValue([
        makeMission({ id: 1, status: MissionStatus.ACTIVE }),
        makeMission({
          id: 2,
          status: MissionStatus.ACTIVE,
          startDate: futureDate,
        }),
        makeMission({ id: 3, status: MissionStatus.ACTIVE, endDate: pastDate }),
        makeMission({ id: 4, status: MissionStatus.ARCHIVED }),
      ]);

      const result = await service.getDashboard(10);

      expect(result.counts.active).toBe(1);
      expect(result.counts.upcoming).toBe(1);
      expect(result.counts.past).toBe(1);
      expect(result.counts.archived).toBe(1);
    });
  });

  // ── findOne ──────────────────────────────────────────────────────
  describe('findOne', () => {
    it('✅ retourne le DTO mappé pour une mission existante', async () => {
      mockPrisma.mission.findFirst.mockResolvedValue(makeMission());

      const result = await service.findOne(10, 1);

      expect(result.id).toBe(1);
      expect(result.participantsCount).toBe(0);
      expect(result.status).toBe('ACTIVE');
    });

    it('❌ lève NotFoundException si la mission est introuvable', async () => {
      mockPrisma.mission.findFirst.mockResolvedValue(null);

      await expect(service.findOne(10, 999)).rejects.toThrow(NotFoundException);
    });

    it('❌ lève NotFoundException si la mission appartient à une autre association', async () => {
      // verifyOwnership filtre par associationId → retourne null si mauvaise association
      mockPrisma.mission.findFirst.mockResolvedValue(null);

      await expect(service.findOne(99, 1)).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ───────────────────────────────────────────────────────
  describe('update', () => {
    const setupTransaction = () => {
      mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
    };

    it('✅ met à jour le titre et retourne le DTO', async () => {
      const existing = makeMission();
      const updated = makeMission({ title: 'Titre modifié' });
      mockPrisma.mission.findFirst.mockResolvedValue(existing);
      setupTransaction();
      mockPrisma.mission.update.mockResolvedValue(updated);

      const result = await service.update(10, 1, { title: 'Titre modifié' });

      expect(mockPrisma.mission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: 'Titre modifié' }),
        }),
      );
      expect(result.title).toBe('Titre modifié');
    });

    it('✅ met à jour les skillIds via delete + createMany dans la transaction', async () => {
      const existing = makeMission();
      mockPrisma.mission.findFirst.mockResolvedValue(existing);
      setupTransaction();
      mockPrisma.missionSkill.deleteMany.mockResolvedValue({});
      mockPrisma.missionSkill.createMany.mockResolvedValue({});
      mockPrisma.skill.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.mission.update.mockResolvedValue(existing);

      await service.update(10, 1, { skillIds: [1] });

      expect(mockPrisma.missionSkill.deleteMany).toHaveBeenCalledWith({
        where: { missionId: 1 },
      });
      expect(mockPrisma.missionSkill.createMany).toHaveBeenCalledWith({
        data: [{ missionId: 1, skillId: 1 }],
      });
    });

    it('❌ lève UnprocessableEntityException si la mission est archivée', async () => {
      mockPrisma.mission.findFirst.mockResolvedValue(
        makeMission({ status: MissionStatus.ARCHIVED }),
      );

      await expect(service.update(10, 1, { title: 'Test' })).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('❌ lève UnprocessableEntityException si la mission est DELETED', async () => {
      mockPrisma.mission.findFirst.mockResolvedValue(
        makeMission({ status: MissionStatus.DELETED }),
      );

      await expect(service.update(10, 1, { title: 'Test' })).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it("✅ détecte un changement d'adresse et génère un warning si des participants existent", async () => {
      const existing = makeMission({
        _count: { participants: 2 },
        address: {
          id: 1,
          street: 'Ancienne rue',
          postalCode: '75001',
          city: 'Paris',
        },
      });
      const updated = makeMission({ title: existing.title });
      mockPrisma.mission.findFirst.mockResolvedValue(existing);
      mockPrisma.address.findFirst.mockResolvedValue(null);
      mockPrisma.address.create.mockResolvedValue({ id: 2 });
      setupTransaction();
      mockPrisma.mission.update.mockResolvedValue(updated);
      mockPrisma.association.findUnique.mockResolvedValue({
        name: 'Asso Test',
      });
      mockPrisma.missionParticipant.findMany.mockResolvedValue([
        { user: { email: 'p@test.com', firstName: 'Jean' } },
      ]);

      const result = await service.update(10, 1, {
        address: { street: 'Nouvelle rue', postalCode: '75002', city: 'Lyon' },
      });

      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
      expect(result.warnings![0]).toContain('adresse');
    });

    it('✅ génère un warning de dates si startDate change et des participants existent', async () => {
      const existing = makeMission({ _count: { participants: 1 } });
      const updated = makeMission();
      mockPrisma.mission.findFirst.mockResolvedValue(existing);
      setupTransaction();
      mockPrisma.mission.update.mockResolvedValue(updated);
      mockPrisma.association.findUnique.mockResolvedValue({
        name: 'Asso Test',
      });
      mockPrisma.missionParticipant.findMany.mockResolvedValue([
        { user: { email: 'p@test.com', firstName: 'Alice' } },
      ]);

      const result = await service.update(10, 1, {
        startDate: '2025-08-01T00:00:00.000Z',
      });

      expect(result.warnings).toBeDefined();
      expect(
        result.warnings!.some((w) => w.toLowerCase().includes('date')),
      ).toBe(true);
    });

    it("✅ n'envoie pas d'email si aucun participant même si l'adresse change", async () => {
      const existing = makeMission({
        _count: { participants: 0 },
        address: {
          id: 1,
          street: 'Ancienne rue',
          postalCode: '75001',
          city: 'Paris',
        },
      });
      const updated = makeMission();
      mockPrisma.mission.findFirst.mockResolvedValue(existing);
      mockPrisma.address.findFirst.mockResolvedValue(null);
      mockPrisma.address.create.mockResolvedValue({ id: 2 });
      setupTransaction();
      mockPrisma.mission.update.mockResolvedValue(updated);

      await service.update(10, 1, {
        address: { street: 'Nouvelle rue', postalCode: '75002', city: 'Lyon' },
      });

      expect(mockMail.sendMissionUpdatedEmail).not.toHaveBeenCalled();
    });

    it("✅ ne génère aucun warning si l'adresse n'a pas réellement changé", async () => {
      const addr = {
        id: 1,
        street: '1 rue Test',
        postalCode: '75001',
        city: 'Paris',
      };
      const existing = makeMission({
        _count: { participants: 5 },
        address: addr,
      });
      const updated = makeMission();
      mockPrisma.mission.findFirst.mockResolvedValue(existing);
      mockPrisma.address.findFirst.mockResolvedValue({ id: 1 });
      setupTransaction();
      mockPrisma.mission.update.mockResolvedValue(updated);

      const result = await service.update(10, 1, {
        address: { street: '1 rue Test', postalCode: '75001', city: 'Paris' },
      });

      expect(result.warnings).toHaveLength(0);
    });
  });

  // ── archive ──────────────────────────────────────────────────────
  describe('archive', () => {
    it('✅ archive une mission ACTIVE et retourne le DTO mis à jour', async () => {
      mockPrisma.mission.findFirst.mockResolvedValue(
        makeMission({ status: MissionStatus.ACTIVE }),
      );
      mockPrisma.mission.update.mockResolvedValue(
        makeMission({ status: MissionStatus.ARCHIVED }),
      );

      const result = await service.archive(10, 1);

      expect(mockPrisma.mission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { status: MissionStatus.ARCHIVED },
        }),
      );
      expect(result.status).toBe('ARCHIVED');
    });

    it('❌ lève UnprocessableEntityException si la mission est déjà archivée', async () => {
      mockPrisma.mission.findFirst.mockResolvedValue(
        makeMission({ status: MissionStatus.ARCHIVED }),
      );

      await expect(service.archive(10, 1)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('❌ lève NotFoundException si la mission est introuvable', async () => {
      mockPrisma.mission.findFirst.mockResolvedValue(null);

      await expect(service.archive(10, 999)).rejects.toThrow(NotFoundException);
    });
  });

  // ── unarchive ────────────────────────────────────────────────────
  describe('unarchive', () => {
    it('✅ désarchive une mission ARCHIVED et la remet en ACTIVE', async () => {
      mockPrisma.mission.findFirst.mockResolvedValue(
        makeMission({ status: MissionStatus.ARCHIVED }),
      );
      mockPrisma.mission.update.mockResolvedValue(
        makeMission({ status: MissionStatus.ACTIVE }),
      );

      const result = await service.unarchive(10, 1);

      expect(mockPrisma.mission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: MissionStatus.ACTIVE },
        }),
      );
      expect(result.status).toBe('ACTIVE');
    });

    it('❌ lève UnprocessableEntityException si la mission est ACTIVE', async () => {
      mockPrisma.mission.findFirst.mockResolvedValue(
        makeMission({ status: MissionStatus.ACTIVE }),
      );

      await expect(service.unarchive(10, 1)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('❌ lève NotFoundException si la mission est introuvable', async () => {
      mockPrisma.mission.findFirst.mockResolvedValue(null);

      await expect(service.unarchive(10, 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── delete ───────────────────────────────────────────────────────
  describe('delete', () => {
    it("✅ supprime (soft) une mission sans participants sans envoyer d'email", async () => {
      mockPrisma.mission.findFirst.mockResolvedValue(
        makeMission({ _count: { participants: 0 } }),
      );
      mockPrisma.mission.update.mockResolvedValue(undefined);

      await service.delete(10, 1);

      expect(mockPrisma.mission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { status: MissionStatus.DELETED },
        }),
      );
      expect(mockMail.sendMissionDeletedEmail).not.toHaveBeenCalled();
    });

    it('✅ supprime avec participants et prépare les emails de notification', async () => {
      const mission = makeMission({
        _count: { participants: 2 },
        title: 'Mission supprimée',
      });
      mockPrisma.mission.findFirst.mockResolvedValue(mission);
      mockPrisma.association.findUnique.mockResolvedValue({
        name: 'Asso Test',
      });
      mockPrisma.missionParticipant.findMany.mockResolvedValue([
        { user: { email: 'alice@test.com', firstName: 'Alice' } },
        { user: { email: 'bob@test.com', firstName: 'Bob' } },
      ]);
      mockPrisma.mission.update.mockResolvedValue(undefined);

      await service.delete(10, 1);

      expect(mockPrisma.mission.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: MissionStatus.DELETED } }),
      );
      // Promise.allSettled est fire-and-forget, pas d'attente ici
    });

    it('❌ lève UnprocessableEntityException si la mission est archivée', async () => {
      mockPrisma.mission.findFirst.mockResolvedValue(
        makeMission({ status: MissionStatus.ARCHIVED }),
      );

      await expect(service.delete(10, 1)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('❌ lève NotFoundException si la mission est introuvable', async () => {
      mockPrisma.mission.findFirst.mockResolvedValue(null);

      await expect(service.delete(10, 999)).rejects.toThrow(NotFoundException);
    });
  });
});
