FROM node:20-alpine AS base
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY apps/mobile/package*.json ./apps/mobile/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/ui/package*.json ./packages/ui/
COPY .npmrc* ./

# Installer toutes les dépendances
RUN npm ci

# Copier le code source
COPY apps/mobile/ ./apps/mobile/
COPY packages/ ./packages/
COPY turbo.json ./

# Build Expo Web
RUN cd apps/mobile && npx expo export --platform web --output-dir dist

# ---- Image de production avec Nginx ----
FROM nginx:alpine AS production

COPY --from=base /app/apps/mobile/dist /usr/share/nginx/html
COPY apps/mobile/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]