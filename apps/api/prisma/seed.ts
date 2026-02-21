import { PrismaClient, UserStatus } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement (nécessaire pour DATABASE_URL)
dotenv.config({ path: '../../../.env' });

// Initialiser l'adaptateur manuellement pour le script
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not defined');
}
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🗑️ Reset complet de la base (TRUNCATE + reset IDs)...');

  // RESET TOTAL + REINITIALISATION DES IDS
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "refresh_tokens",
      "token",
      "association_users",
      "associations",
      "association_categories",
      "users",
      "addresses"
    RESTART IDENTITY CASCADE;
  `);

  console.log('✅ Base reset avec IDs réinitialisés');
  console.log('🌱 Début du seeding...');

  const passwordHash = await argon2.hash('password');
  const now = new Date();

  // Données centralisées
  const usersData = [
    {
      email: 'admin@gmail.com',
      firstName: 'Admin',
      lastName: 'GiveAway',
      age: 30,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      address: {
        street: '123 Rue de la Solidarité',
        postalCode: '75001',
        city: 'Paris',
      },
    },
    {
      email: 'user1@gmail.com',
      firstName: 'Jean',
      lastName: 'Dupont',
      age: 25,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      address: {
        street: '45 Avenue des Champs-Élysées',
        postalCode: '75008',
        city: 'Paris',
      },
    },
    {
      email: 'user2@gmail.com',
      firstName: 'Marie',
      lastName: 'Curie',
      age: 28,
      status: UserStatus.PENDING,
      address: {
        street: '12 Boulevard Saint-Germain',
        postalCode: '75005',
        city: 'Paris',
      },
    },
    {
      email: 'user3@gmail.com',
      firstName: 'Jane',
      lastName: 'Doe',
      age: 28,
      status: UserStatus.SUSPENDED,
      emailVerified: true,
      address: {
        street: '78 Rue de la République',
        postalCode: '69002',
        city: 'Lyon',
      },
    },
    {
      email: 'user4@gmail.com',
      firstName: 'John',
      lastName: 'Doe',
      age: 28,
      status: UserStatus.DELETED,
      emailVerified: true,
      address: {
        street: '56 Cours Mirabeau',
        postalCode: '13100',
        city: 'Aix-en-Provence',
      },
    },
  ];

  // Transaction globale
  await prisma.$transaction(async (tx) => {
    for (const user of usersData) {
      await tx.user.create({
        data: {
          email: user.email,
          password: passwordHash,
          firstName: user.firstName,
          lastName: user.lastName,
          age: user.age,
          status: user.status,
          emailVerifiedAt: user.emailVerified ? now : null,
          address: {
            create: user.address,
          },
        },
      });
    }
  });

  console.log('✅ Seed terminé avec succès !');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Erreur durant le seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
