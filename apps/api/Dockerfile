FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/typescript-config/package*.json ./packages/typescript-config/
COPY packages/eslint-config/package*.json ./packages/eslint-config/
COPY .npmrc* ./

RUN npm ci

COPY apps/api/ ./apps/api/
COPY packages/ ./packages/
COPY turbo.json ./

RUN cd apps/api && DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate --schema prisma/schema.prisma

RUN npx turbo run build --filter=api --filter=./packages/*

FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/typescript-config/package*.json ./packages/typescript-config/
COPY packages/eslint-config/package*.json ./packages/eslint-config/
COPY .npmrc* ./
RUN npm ci --omit=dev

FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

COPY --from=base /app/apps/api/dist ./dist
COPY --from=base /app/apps/api/prisma ./prisma
COPY --from=base /app/apps/api/prisma.config.ts ./prisma.config.ts
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=base /app/node_modules/dotenv ./node_modules/dotenv
COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/packages/shared/package.json ./packages/shared/package.json

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy --schema ./prisma/schema.prisma && node dist/src/main"]
