import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

// 1. On récupère l'URL de test
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in .env.test');
}

// 2. On instancie l'adapter directement (comme dans ton service)
const adapter = new PrismaPg({
  connectionString: connectionString,
});

// 3. On crée le client avec l'adapter
export const prisma = new PrismaClient({ adapter });

export async function cleanDatabase() {
  // L'ordre suppression : Enfants (Tokens) puis Parents (Users)
  // On utilise deleteMany pour éviter les erreurs si la table est déjà vide
  const deleteTokens = prisma.token.deleteMany();
  const deleteUsers = prisma.user.deleteMany();

  await prisma.$transaction([deleteTokens, deleteUsers]);
}
