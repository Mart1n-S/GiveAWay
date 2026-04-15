FROM node:20-alpine AS base
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/typescript-config/package*.json ./packages/typescript-config/
COPY packages/eslint-config/package*.json ./packages/eslint-config/
COPY .npmrc* ./

# Installer toutes les dépendances
RUN npm ci

# Copier le code source
COPY apps/api/ ./apps/api/
COPY packages/ ./packages/
COPY turbo.json ./

# Générer Prisma (DATABASE_URL fictive requise par Prisma v6 au moment du generate)
RUN cd apps/api && DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate --schema prisma/schema.prisma

# Build NestJS via Turborepo
RUN npx turbo run build --filter=api --filter=./packages/*

# ---- Image de production ----
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Copier uniquement ce qui est nécessaire
COPY --from=base /app/apps/api/dist ./dist
COPY --from=base /app/apps/api/prisma ./prisma
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=base /app/packages ./packages

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy --schema ./prisma/schema.prisma && node dist/main"]