import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { UserStatus } from '../src/generated/prisma/client';

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
