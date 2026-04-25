# CLAUDE.md — Contexte projet GiveAWay

Ce fichier centralise tout le contexte architectural, technique et organisationnel du projet **GiveAWay** pour permettre une assistance cohérente sans relecture systématique du code.

---

## 1. Présentation du projet

**GiveAWay** est une plateforme de mise en relation bénévoles ↔ associations.
Concept : comme une app de rencontre, mais pour le bénévolat — un algorithme de matching intelligent propose des missions selon la géolocalisation et les centres d'intérêt du bénévole.

Projet annuel ESGI 5e année IW (2025–2026). Repo GitHub : `Mart1n-S/GiveAWay`.

---

## 2. Stack technique

| Domaine | Technologie |
|---|---|
| Monorepo | Turborepo + npm workspaces |
| Langage | TypeScript (strict, partagé E2E) |
| Backend | NestJS + Prisma + PostgreSQL |
| Frontend | Expo (React Native) + Expo Router |
| Styles | NativeWind v4 (Tailwind pour RN) |
| Formulaires | React Hook Form + Zod |
| État global | Zustand (avec persist) |
| HTTP client | Axios (intercepteurs avancés) |
| Auth | JWT (access 15m / refresh 7j) + Google OAuth |
| Emails | Brevo (ex-Sendinblue) |
| Fichiers | Local (dev) ou Cloudinary (prod) |
| Tests backend | Jest (unitaires + E2E Supertest) |
| Tests frontend | Playwright |
| CI/Qualité | SonarCloud (sonar-project.properties) |
| Infra dev | Docker Compose (PostgreSQL + pgAdmin) |

---

## 3. Structure monorepo

```
GiveAWay/
├── apps/
│   ├── api/          # Backend NestJS (port 3000)
│   └── mobile/       # Expo iOS/Android/Web (port 8081)
├── packages/
│   ├── shared/       # DTOs, Types, Enums, Schémas Zod partagés
│   ├── eslint-config/
│   └── typescript-config/
├── compose.yml       # Docker (postgres dev + test + pgAdmin)
├── turbo.json        # Pipeline Turborepo
├── package.json      # Scripts racine + workspaces
├── CONTEXT.md        # Guidelines d'architecture pour l'équipe/IA
└── sonar-project.properties
```

---

## 4. Règles d'architecture (CONTEXT.md)

### Règle d'or : "Shared First"
Toute interface, DTO, validation Zod ou constante utilisée (ou susceptible de l'être) par le back **ET** le front **doit** être créée dans `packages/shared` (`@repo/shared`). Jamais de duplication entre `apps/api` et `apps/mobile`.

### Backend
- **Controller** : routing HTTP uniquement, aucune logique métier.
- **Service** : contient toute la business logic.
- **`src/common`** : Guards, Interceptors, Decorators, Filters, Pipes transversaux.
- Toujours utiliser les DTOs de `@repo/shared` en réponse — ne jamais exposer les entités Prisma brutes (elles contiennent des champs sensibles comme `password`).
- Les migrations Prisma sont obligatoires pour tout changement de schéma.

### Frontend
- Les appels API sont **uniquement** dans `src/services/`, jamais directement dans les composants.
- `AppShell` est le parent obligatoire de tous les `_layout.tsx`.
- Les composants `src/components/ui` sont **agnostiques** : aucune logique métier, aucun appel API.
- `FormInput` / `FormTextarea` : toujours utiliser les wrappers react-hook-form — interdit de passer `value/onChange` manuellement.
- Alias `@/` pointe vers `src/`.

### Workflow d'une feature
1. Définir le DTO dans `@repo/shared` (+ fichier de test `.spec.ts`)
2. Implémenter le backend (`apps/api`) + tests unitaires + E2E
3. Créer/mettre à jour le composant UI dans `apps/mobile/src/components/ui`
4. Implémenter la page et le service dans `apps/mobile`

### Conventions de nommage
- Fichiers : `kebab-case` (`auth.service.ts`, `user-profile.tsx`)
- Classes/Interfaces : `PascalCase` (`AuthService`, `LoginDto`)
- Variables/Méthodes : `camelCase`
- Pas de "Magic Numbers" : utiliser des constantes nommées

---

## 5. Base de données (Prisma)

### Modèles principaux
- **User** : entité centrale. Statuts : `PENDING | ACTIVE | SUSPENDED | DELETED`. Password optionnel (Google OAuth = pas de password local).
- **Mission** : types `MISSION | EVENT | COLLECT | INFO`, fréquence `ONE_TIME | DAILY | WEEKLY | MONTHLY`, flag `hasRegistration`.
- **Association** : statuts `PENDING | VALIDATED | REJECTED | SUSPENDED`, champs SIRET/RNA pour vérification juridique.
- **AssociationUser** : rôles `OWNER | ADMIN | EDITOR`.
- **RefreshToken** : tokens hashés Argon2, stocke user-agent + IP pour audit.
- **Token** : tokens de vérification email et reset password (6 chiffres, 15 min).
- **UserSkill / UserCause** : Many-to-Many → base du matching.
- **UserAvailability** : fréquence (`HOURS_WEEK`, `DAYS_MONTH`...), créneaux (`WEEKDAY`, `WEEKEND`, `EVENING`, `ALL_TIME`), type (`REMOTE`, `ON_SITE`, `HYBRID`).
- **MissionParticipant** : pivot User-Mission pour l'historique.

### Seed data
- 16 compétences, 29 causes, 10 publics cibles, 8 types bénévoles, 9 catégories d'associations.
- Compte admin de test : `admin@gmail.com` / `password`.

---

## 6. Backend NestJS (`apps/api/src/`)

### Modules
| Module | Rôle |
|---|---|
| `auth/` | Login, Register, Google OAuth, Refresh token, Password reset, Email verification |
| `profile/` | CRUD profil utilisateur + upload avatar |
| `reference/` | Endpoints publics : skills et causes (pas d'auth requise) |
| `common/files/` | Abstraction storage (Factory : Cloudinary vs Local) |
| `common/pipes/` | ZodValidationPipe, ImageValidationPipe |
| `common/filters/` | ThrottlerExceptionFilter (retourne message 429 custom) |
| `mail/` | Envoi emails via Brevo API |
| `prisma/` | PrismaService (étend PrismaClient) |

### Sécurité
- **Argon2** pour hash des passwords et refresh tokens (pas bcrypt).
- **JWT split** : access token (15m, cookie ou Bearer) + refresh token (7j, cookie ou body mobile).
- **JwtStrategy** : extrait token des cookies (priorité) ou header Bearer ; rejette si user non `ACTIVE`.
- **GuestGuard** : garde inversée — rejette si l'utilisateur est déjà authentifié (utilisé sur login/register).
- **ImageValidationPipe** : vérification des **magic numbers** binaires (JPEG `FFD8FF`, PNG `89504E47`, WEBP `RIFF...WEBP`) + MIME type + taille max 5 Mo.
- **Rate limiting** : global 100/5min + login 5/heure + register 10/heure.
- **Prisma** : requêtes paramétrées → protection SQL injection.
- CORS : `origin: true` en dev — **à restreindre en prod**.

### Auth Google OAuth
Double stratégie selon plateforme (déterminée via header `x-client-type: 'web' | 'mobile'`) :
- **Web** : access_token → appelle endpoint UserInfo Google
- **Mobile** : ID token JWT → vérification multi-audience (web, android, iOS client IDs)

Backend vérifie la signature JWT, extrait email + googleId, crée le compte si inexistant (statut `ACTIVE` direct car Google est trusted), lie le googleId si email déjà existant.

### AuthService — méthodes clés
- `generateTokens()` : `Promise.all` pour créer access + refresh en parallèle.
- `saveRefreshToken()` : hash Argon2, stocke user-agent + IP.
- `mapUserToResponse()` : convertit PrismaUser → DTO partagé (ne jamais exposer le modèle Prisma brut).

### ProfileService — logique update
Transaction multi-étapes : infos de base → photo (upload + suppression ancienne) → adresse (upsert) → compétences (delete + recreate) → causes (delete + recreate) → disponibilités (upsert, si tous créneaux = `ALL_TIME`).

### FilesModule — Factory pattern
Selon `STORAGE_TYPE` env :
- `local` → `LocalFileService` (stocke dans `uploads/`, servi en statique)
- `cloudinary` → `CloudinaryService` (CDN, retourne URL + publicId)
Interface commune : `IFileService` avec `uploadFile(file, folder)` et `deleteFile(publicId)`.

### MailService
Mode `test` : log console + délai simulé 1s, **aucun appel Brevo réel**.
Mode dev/prod : appel Brevo API REST.
Templates : vérification email (code 6 chiffres, 15 min) + reset password.

### Tests backend
- **Unitaires** : mock systématique des dépendances (PrismaService, MailService, FileService).
- **E2E** : BDD de test dédiée (port 5433), `cleanDatabase()` avant chaque test, override `FILE_SERVICE` avec mock pour éviter appels Cloudinary/SMTP.
- Variable `USE_DETERMINISTIC_OTP=true` en `.env.test` pour OTP prévisibles.

---

## 7. Frontend Expo (`apps/mobile/`)

### Routing (Expo Router — file-based)
```
app/
├── (auth)/           → connexion, inscription (multi-étapes), reset password
├── (main)/           → dashboard, profil (view / modifier / supprimer)
└── (dev)/            → design-system (dev uniquement)
```
Les groupes `(auth)`, `(main)`, `(dev)` sont des route groups (invisibles dans l'URL).

### AppShell
Composant parent obligatoire de tous les `_layout.tsx`. Gère :
- StatusBar (style `dark`)
- État d'authentification (`useAuthStore`)
- NavBar web responsive

Prop `layoutType` :
- `"main"` → NavBar + Tabs mobile en bas
- `"subpage"` → NavBar web seulement, header natif Stack sur mobile (flèche retour)

### Stores Zustand (`src/stores/`)
| Store | Persisté | Contenu |
|---|---|---|
| `auth.store.ts` | Oui (tokens + user) | `user`, `accessToken`, `refreshToken`, `isAuthenticated`, `isHydrated` |
| `profile.store.ts` | Oui (profile seulement) | `profile`, `isLoading` (non persisté) |
| `reference.store.ts` | Oui | `skills`, `causes`, `isLoaded`, `isLoading` |

- **`isHydrated`** dans AuthStore : bloque le rendu (SplashScreen actif) tant que le storage async n'est pas chargé.
- **Storage abstraction** (`storage.ts`) : `SecureStore` sur mobile (chiffré), `localStorage` sur web.
- **ReferenceStore** : lazy load — ne recharge pas si déjà chargé.

### Axios (`src/lib/axios.ts`) — logique avancée
**Détection URL API automatique :**
1. `EXPO_PUBLIC_API_URL` si défini (prod ou APK dev)
2. Web → `http://localhost:3000`
3. Mobile → IP hôte Expo (`Constants.expoConfig.hostUri`) ou fallback `10.0.2.2` (émulateur Android)

**Header `x-client-type`** : `'web'` ou `'mobile'` → backend adapte le format de réponse (cookies vs JSON body).

**Intercepteur 401 — gestion concurrente :**
- Si refresh déjà en cours : enqueue la requête et réessaie après le nouveau token.
- Mobile : POST `/auth/refresh` avec `Authorization: Bearer ${refreshToken}` dans le body, parse `{ backendTokens: { accessToken, refreshToken } }`.
- Web : cookies httpOnly gérés automatiquement par le navigateur.
- Ignore les 401 venant de `/auth/refresh` ou `/auth/login` pour éviter les boucles infinies.

### Hook `useGoogleAuth` (`src/hooks/`)
- **Web** : PKCE flow via `expo-auth-session` (popup)
- **Mobile** : SDK natif `@react-native-google-signin` (Google Play Services / GoogleSignIn iOS)
- Import dynamique → évite les crashes sur Expo Go
- Si `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` absent : hook désactivé silencieusement

### Services (`src/services/`)
- `auth.service.ts` : login, googleLogin (FormData plateforme-adapté), register (FormData avec image), logout (non-bloquant)
- `profile.service.ts` : getProfile (cache-first), updateProfile (FormData complexe), deleteAccount
- `reference.service.ts` : getSkills, getCauses

### Composants UI (`src/components/ui/`)
Design system complet, agnostique de toute logique métier :
- Composants de base : `Button`, `Input`, `Textarea`, `Text`, `Avatar`
- Composants profil : `ProfileHeader`, `ProfileStats`, `ProfileBioCard`, `ProfileAvailability`, `ProfileCausesSkills`, `ProfileHistory`, `ProfileActions`
- Composants spéciaux : `MultiSelectList`, `AvailabilityPicker`, `Map` (polymorphe : `.native.tsx` vs `.web.tsx`)
- Tokens de design : `src/components/ui/theme/tokens.ts` (couleurs, tailles)

### Composants Form (`src/components/form/`)
- `FormInput` : wrapper react-hook-form + `Input` UI, typage générique `T extends FieldValues`
- `FormTextarea` : idem pour textarea

### Navigation (`src/config/navigation.ts`)
Source de vérité unique pour les menus. Propriété `hideInMobileDrawer: true` : cache le lien du drawer mobile (présent dans la Bottom Bar), ignorée sur web.

---

## 8. Couche partagée (`packages/shared/src/`)

Tout est validé avec **Zod** — même schéma utilisé côté frontend (validation formulaire) et backend (ZodValidationPipe).

### DTOs clés
- **`RegisterDto`** : NAME_REGEX (`/^[a-zA-ZÀ-ÿ\s\-']*$/`), password 12+ chars (maj/min/chiffre/spécial), age 18-100, NO_HTML_TAGS (`/^[^<>]*$/`), `acceptTerms` must be `true`
- **`LoginDto`** : email lowercase + password
- **`GoogleLoginDto`** : `{ idToken, isAccessToken: boolean }`
- **`AddressDto`** : postalCode 5 chiffres, validation croisée lat/lon (si un présent → les deux requis)
- **`UpdateProfileDto`** : gère le multipart FormData (strings JSON stringifiées pour `address`, `availability`)
- **`DeleteAccountDto`** : password OU confirmation texte "SUPPRIMER" selon type de compte

### Enums disponibilités
```typescript
AvailabilityFrequency: HOURS_WEEK | HOURS_MONTH | DAYS_WEEK | DAYS_MONTH | ONE_DAY | PUNCTUAL
AvailabilityTime:      WEEKDAY | WEEKEND | EVENING | ALL_TIME
AvailabilityType:      REMOTE | ON_SITE | HYBRID
```

### Constants partagées
- `NAME_REGEX` : `/^[a-zA-ZÀ-ÿ\s\-']*$/`
- `PASSWORD_REGEX` : majuscule + minuscule + chiffre + caractère spécial
- `NO_HTML_TAGS` : `/^[^<>]*$/`

---

## 9. Infrastructure Docker (`compose.yml`)

| Service | Port hôte | Usage |
|---|---|---|
| `giveaway_db` | `${POSTGRES_PORT}` (défaut 5434) | BDD de développement |
| `giveaway_db_test` | `5433` | BDD de test (credentials fixes : `postgres/password`) |
| `giveaway_pgadmin` | `${PGADMIN_PORT}` (défaut 8080) | Interface admin |

- `db` a un healthcheck `pg_isready` — pgAdmin attend que la BDD soit saine.
- `db_test` a des credentials hardcodés — cohérent avec `.env.test`.

---

## 10. Variables d'environnement

### `.env` (racine, pour l'API)
- `DATABASE_URL` : pas de `${}` imbriqués (Prisma ne les résout pas nativement)
- `JWT_ACCESS_EXPIRES_IN="15m"` / `JWT_REFRESH_EXPIRES_IN="7d"`
- `STORAGE_TYPE=local` (dev) ou `cloudinary` (prod)
- `GOOGLE_CLIENT_WEB_ID`, `GOOGLE_ANDROID_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID`
- `THROTTLER_DISABLED=false`

### `.env.test`
- `THROTTLER_DISABLED=true`
- JWT courts : `1m` / `5m`
- `USE_DETERMINISTIC_OTP="true"` → OTP prévisibles pour les tests

### `apps/mobile/.env`
- `EXPO_PUBLIC_API_URL` : laisser vide en dev standard (détection auto), définir l'IP locale pour tester Google Auth sur APK
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` : requis même en dev (mettre une valeur aléatoire pour éviter les erreurs)

---

## 11. Google OAuth — points importants

- `google-services.json` **non commité** — à récupérer depuis Firebase Console.
- Chaque développeur génère son propre SHA-1 Android via `eas credentials`.
- `EXPO_NATIVE_BUILD=true` active les plugins natifs dans `app.config.js` — injecté auto par `npm run dev:native`.
- Expo Go **ne supporte pas** Google Auth mobile (modules natifs) → nécessite un APK Development Build via `eas build`.
- Organisation Expo : `giveaway-team`, projectId : `8ec15cbb-f3af-4dbe-ae4b-48c7bea59faf`.
- `iosUrlScheme` = Client ID iOS **inversé**.

---

## 12. SonarCloud

- Clé projet : `Mart1n-S_GiveAWay`, organisation : `mart1n-s`
- Sources analysées : `apps/mobile/src`, `apps/mobile/app`, `apps/api/src`, `packages/shared/src`
- Fichiers de test exclus de l'analyse (`.spec.ts`, `.test.ts`, `.e2e.ts`)
- Couverture LCOV : `apps/api/coverage/lcov.info` + `packages/shared/coverage/lcov.info`
- `mail.service.ts` et `prisma/**` exclus de la couverture

---

## 13. Scripts Turborepo — comportements notables

- `build` : dépend du build des dépendances (`^build`), se relance si `.env*` change.
- `test` / `test:cov` : dépend du build, résultat mis en cache selon `src/**` et `test/**`.
- `test:e2e` : **jamais mis en cache** (`cache: false`) — toujours réexécuté.
- `dev` : `persistent: true` — processus qui ne se termine pas (watcher).

---

## 14. Flux utilisateurs clés

### Inscription
Register (FormData) → ZodValidationPipe + ImageValidationPipe → upload avatar (avec rollback) → hash Argon2 → user `PENDING` → token OTP 6 chiffres → email Brevo → vérification code → user `ACTIVE`

### Connexion email
POST `/auth/login` → vérif email vérifié → vérif Argon2 → génération tokens → cookies (web) ou JSON body (mobile)

### Connexion Google
Clic → SDK plateforme → `idToken` → POST `/auth/google` avec `x-client-type` → vérif JWT multi-audience → lier ou créer compte (`ACTIVE` direct) → tokens

### Refresh token (automatique via intercepteur Axios)
401 reçu → intercepteur détecte → queue si refresh en cours → POST `/auth/refresh` → nouveau token → relance requête originale

### Édition profil
GET `/profile` → PATCH `/profile` (FormData) → transaction Prisma (infos + photo + adresse + compétences + causes + disponibilités) → retourne User complet → update AuthStore + ProfileStore

---

## 15. Fonctionnalités MVP implémentées vs futures

### Implémenté
- Authentification complète (email/password + Google OAuth, Web + Mobile)
- Vérification email, reset password
- Profil bénévole (CRUD complet avec compétences, causes, disponibilités, adresse, avatar)
- Référentiels skills et causes
- Design system complet
- Tests unitaires + E2E backend + E2E frontend (Playwright)

### Non implémenté (A faire)
- Algorithme de matching (géolocalisation + tags)
- Panel admin
- WebSocket (temps réel)
