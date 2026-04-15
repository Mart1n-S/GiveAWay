FROM node:20-alpine AS base
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY apps/mobile/package*.json ./apps/mobile/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/typescript-config/package*.json ./packages/typescript-config/
COPY packages/eslint-config/package*.json ./packages/eslint-config/
COPY .npmrc* ./

# Installer toutes les dépendances
RUN npm ci

# Copier le code source
COPY apps/mobile/ ./apps/mobile/
COPY packages/ ./packages/
COPY turbo.json ./

# Variables d'environnement baked dans le bundle Expo au build
ARG EXPO_PUBLIC_API_URL
ARG EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=$EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID

# Build @repo/shared (requis par Metro pour résoudre les imports)
RUN npx turbo run build --filter=./packages/shared

# Build Expo Web
RUN cd apps/mobile && npx expo export --platform web --output-dir dist

# ---- Image de production avec Nginx ----
FROM nginx:alpine AS production

COPY --from=base /app/apps/mobile/dist /usr/share/nginx/html
COPY apps/mobile/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]