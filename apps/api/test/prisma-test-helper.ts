import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  UserStatus,
  AssociationStatus,
  AssociationRole,
  MissionStatus,
  ActivityType,
} from '../src/generated/prisma/client';

// 1. On récupère l'URL de test
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in .env.test');
}

// 2. On instancie l'adapter directement
const adapter = new PrismaPg({
  connectionString: connectionString,
});

// 3. On crée le client avec l'adapter
export const prisma = new PrismaClient({ adapter });

export async function cleanDatabase() {
  // L'ordre suppression : Enfants (Tokens, AssociationUser via cascade) puis Parents (Users, Associations).
  // Les Associations ne sont pas FK'd vers User : il faut les supprimer explicitement
  // pour éviter les rangées orphelines entre tests (notamment d'inscription d'association).
  const deleteTokens = prisma.token.deleteMany();
  const deleteAssociations = prisma.association.deleteMany();
  const deleteUsers = prisma.user.deleteMany();

  await prisma.$transaction([deleteTokens, deleteAssociations, deleteUsers]);
}

/**
 * Crée une association de test avec son OWNER.
 */
export async function createTestAssociation(ownerId: number) {
  return prisma.association.create({
    data: {
      name: 'Association E2E Test',
      object: 'Objet de test E2E',
      legalStatus: 'Association loi 1901',
      rna: 'W999999999',
      status: AssociationStatus.VALIDATED,
      members: {
        create: {
          userId: ownerId,
          role: AssociationRole.OWNER,
        },
      },
    },
  });
}

/**
 * Crée une association avec une adresse géolocalisée (pour les tests de proximité).
 * L'association est VALIDATED et possède des coordonnées lat/lng.
 */
export async function createTestAssociationWithAddress(
  ownerId: number,
  lat: number,
  lng: number,
) {
  return prisma.association.create({
    data: {
      name: 'Association Géolocalisée E2E',
      object: 'Test de proximité E2E',
      legalStatus: 'Association loi 1901',
      rna: 'W888888888',
      status: AssociationStatus.VALIDATED,
      members: {
        create: {
          userId: ownerId,
          role: AssociationRole.OWNER,
        },
      },
      address: {
        create: {
          street: '1 rue de la Paix',
          postalCode: '75001',
          city: 'Paris',
          latitude: lat,
          longitude: lng,
        },
      },
    },
  });
}

/**
 * Ajoute un membre à une association existante.
 */
export async function addAssociationMember(
  associationId: number,
  userId: number,
  role: AssociationRole,
) {
  return prisma.associationUser.create({
    data: { associationId, userId, role },
  });
}

/**
 * Crée une mission de test liée à une association.
 * Par défaut : MISSION ACTIVE sans adresse.
 * Avec `withAddress: true`, la mission reçoit une adresse parisienne avec coordonnées.
 */
export async function createTestMission(
  associationId: number,
  options: {
    title?: string;
    type?: ActivityType;
    status?: MissionStatus;
    withAddress?: boolean;
    lat?: number;
    lng?: number;
    volunteersNeeded?: number;
  } = {},
) {
  const {
    title = 'Mission E2E Test',
    type = ActivityType.MISSION,
    status = MissionStatus.ACTIVE,
    withAddress = false,
    lat = 48.85,
    lng = 2.35,
    volunteersNeeded,
  } = options;

  return prisma.mission.create({
    data: {
      title,
      description:
        'Description de la mission de test E2E pour les tests automatisés.',
      type,
      hasRegistration: true,
      status,
      volunteersNeeded: volunteersNeeded ?? null,
      association: { connect: { id: associationId } },
      ...(withAddress && {
        address: {
          create: {
            street: '10 rue de la Paix',
            postalCode: '75001',
            city: 'Paris',
            latitude: lat,
            longitude: lng,
          },
        },
      }),
    },
  });
}

/**
 * Inscrit un utilisateur à une mission (crée une entrée MissionParticipant).
 */
export async function createTestMissionParticipant(
  missionId: number,
  userId: number,
) {
  return prisma.missionParticipant.create({
    data: { missionId, userId },
  });
}

/**
 * Crée un utilisateur prêt à l'emploi (activé) pour les tests de connexion
 */

const userDto = {
  password: 'Password123!',
  confirmPassword: 'Password123!',
  firstName: 'John',
  lastName: 'Doe',
  age: 25,
  acceptTerms: true,
  address: {
    street: '10 rue E2E',
    postalCode: '75000',
    city: 'Paris',
    latitude: 48.85,
    longitude: 2.35,
  },
};

export async function createTestUser(workerIndex: number = 0) {
  const argon2 = await import('argon2');
  const hashedPassword = await argon2.hash(userDto.password);

  const uniqueEmail = `e2e.${workerIndex}@test.com`;

  return await prisma.user.upsert({
    where: { email: uniqueEmail },
    update: {
      password: hashedPassword,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: uniqueEmail,
      password: hashedPassword,
      firstName: userDto.firstName,
      lastName: userDto.lastName,
      age: userDto.age,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      address: {
        create: {
          street: userDto.address.street,
          postalCode: userDto.address.postalCode,
          city: userDto.address.city,
        },
      },
    },
  });
}
