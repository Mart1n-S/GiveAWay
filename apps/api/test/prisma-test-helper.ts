import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  UserStatus,
  AssociationStatus,
  AssociationRole,
  MissionStatus,
  ActivityType,
  AvailabilityType,
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

/**
 * Helper de compatibilité — accepté pour ne pas casser les .spec.ts qui
 * passent `testInfo.parallelIndex`. Retourne toujours le même client
 * puisqu'on n'a qu'une seule BDD de test.
 */
export function getPrisma(_workerIndex: number = 0): PrismaClient {
  return prisma;
}

export async function cleanDatabase() {
  // L'ordre suppression : Enfants (Tokens, AssociationUser via cascade) puis Parents (Users, Associations).
  // Les Associations ne sont pas FK'd vers User : il faut les supprimer explicitement
  // pour éviter les rangées orphelines entre tests (notamment d'inscription d'association).
  const deleteMessages = prisma.message.deleteMany();
  const deleteConversations = prisma.conversation.deleteMany();
  const deleteTokens = prisma.token.deleteMany();
  const deleteAssociations = prisma.association.deleteMany();
  const deleteUsers = prisma.user.deleteMany();

  await prisma.$transaction([
    deleteMessages,
    deleteConversations,
    deleteTokens,
    deleteAssociations,
    deleteUsers,
  ]);
}

/**
 * Tag inséré dans les emails et noms d'associations pour isoler les données
 * de chaque worker Playwright. Permet à plusieurs workers de tourner en
 * parallèle sur la même BDD de test sans se piétiner.
 */
export const workerTag = (workerIndex: number) => `w${workerIndex}`;

/**
 * Nettoie la BDD du worker donné. Chaque worker ayant sa propre instance
 * Postgres, un wipe complet suffit — pas besoin de filtrer par tag.
 * Les cascades onDelete s'occupent des enfants (tokens, missions, etc.).
 */
export async function cleanDatabaseForWorker(workerIndex: number) {
  const db = getPrisma(workerIndex);
  await db.$transaction([
    db.message.deleteMany(),
    db.conversation.deleteMany(),
    db.token.deleteMany(),
    db.association.deleteMany(),
    db.user.deleteMany(),
  ]);
}

/**
 * Crée une association de test avec son OWNER.
 * `workerIndex` insère le tag worker dans le nom pour permettre le cleanup parallèle.
 */
export async function createTestAssociation(
  ownerId: number,
  workerIndex: number = 0,
) {
  const tag = workerTag(workerIndex);
  return getPrisma(workerIndex).association.create({
    data: {
      name: `Association E2E Test [${tag}]`,
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
  workerIndex: number = 0,
) {
  const tag = workerTag(workerIndex);
  return getPrisma(workerIndex).association.create({
    data: {
      name: `Association Géolocalisée E2E [${tag}]`,
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
  workerIndex: number = 0,
) {
  return getPrisma(workerIndex).associationUser.create({
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
    availabilityType?: AvailabilityType;
    status?: MissionStatus;
    withAddress?: boolean;
    lat?: number;
    lng?: number;
    volunteersNeeded?: number;
    workerIndex?: number;
  } = {},
) {
  const {
    title = 'Mission E2E Test',
    type = ActivityType.MISSION,
    availabilityType = AvailabilityType.ON_SITE,
    status = MissionStatus.ACTIVE,
    withAddress = true,
    lat = 48.85,
    lng = 2.35,
    volunteersNeeded,
    workerIndex = 0,
  } = options;

  return getPrisma(workerIndex).mission.create({
    data: {
      title,
      description:
        'Description de la mission de test E2E pour les tests automatisés.',
      type,
      availabilityType,
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
  workerIndex: number = 0,
) {
  return getPrisma(workerIndex).missionParticipant.create({
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

export async function createTestUser(
  workerIndex: number = 0,
  suffix?: string,
) {
  const argon2 = await import('argon2');
  const hashedPassword = await argon2.hash(userDto.password);

  const uniqueEmail = suffix
    ? `e2e.${workerTag(workerIndex)}.${suffix}@test.com`
    : `e2e.${workerTag(workerIndex)}@test.com`;

  return await getPrisma(workerIndex).user.upsert({
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
