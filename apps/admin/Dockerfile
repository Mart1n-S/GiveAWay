FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./
COPY apps/admin/package*.json ./apps/admin/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/typescript-config/package*.json ./packages/typescript-config/
COPY packages/eslint-config/package*.json ./packages/eslint-config/
COPY .npmrc* ./

RUN npm ci

COPY apps/admin/ ./apps/admin/
COPY packages/ ./packages/
COPY turbo.json ./

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npx turbo run build --filter=./packages/shared
RUN cd apps/admin && npm run build

FROM nginx:alpine AS production

COPY --from=base /app/apps/admin/dist /usr/share/nginx/html
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
