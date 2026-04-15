import { defineConfig, env } from 'prisma/config';

// En dev, charger le .env via dotenv si disponible
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { config } = require('dotenv');
  config({ path: '../../.env' });
} catch {
  // dotenv non disponible en production, les env vars viennent de Kubernetes
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
