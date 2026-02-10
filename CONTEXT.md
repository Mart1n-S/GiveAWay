# 🧠 Project Context & Guidelines (GiveAWay)

Ce document définit les règles d'architecture, les conventions de code et les standards de qualité pour le projet **GiveAWay**.
**Toute génération de code doit strictement respecter ces directives.**

---

## 1. 🏗️ Architecture Globale (Monorepo)

Le projet utilise **Turborepo**. La philosophie centrale est **"Shared First"** pour la logique métier, mais l'UI est  locale au mobile.

### Arborescence Simplifiée

* **`apps/api`** : Backend (NestJS + Prisma).
* **`apps/mobile`** : Frontend (Expo / React Native). Contient désormais le Design System et les formulaires.
* **`packages/shared`** : DTOs, Types, Enums, Logique métier partagée (Zod).

### 🚨 Règle d'Or : "Shared First"

Si une interface, un DTO, une validation Zod ou une constante est utilisée (ou susceptible d'être utilisée) par le Back **ET** le Front :

1. Elle **DOIT** être créée dans `@repo/shared`.
2. Chaque DTO doit avoir son propre fichier (ex: `login.dto.ts`) et son fichier de test associé (`login.dto.spec.ts`).
3. Jamais de duplication de types entre `apps/api` et `apps/mobile`.

---

## 2. 🔙 Backend (`apps/api`)

**Stack :** NestJS, Prisma (PostgreSQL), Passport (JWT), Jest.

### Structure & Clean Architecture

* **Modules :** Découpage par fonctionnalité (ex: `auth`, `users`).
* **Controller :** Gère uniquement le routing HTTP et l'appel aux services. Pas de logique métier complexe.
* **Service :** Contient la logique métier (Business Logic).
* **Common (`src/common`) :**
* Contient ce qui est transversal : Guards, Interceptors, Decorators, Filters.
* **`files` module :** Utilise un pattern **Factory** pour basculer dynamiquement entre le stockage **Local** (Dev) et **Cloudinary** (Prod) via `STORAGE_TYPE` dans le `.env`.
* **Pipes :** Utilisation de Pipes personnalisés (ex: `image-validation.pipe.ts`) pour valider types MIME (Magic Numbers) et taille.



### Base de Données (Prisma)

* Utiliser `prisma.schema` pour la définition.
* Les migrations sont obligatoires pour tout changement de schéma.
* Ne jamais exposer les entités Prisma brutes si elles contiennent des données sensibles (password), utiliser les DTOs de `@repo/shared` pour la réponse.

### 🧪 Stratégie de Test (Obligatoire)

1. **Tests Unitaires (`.spec.ts`) :**
* Chaque service doit être testé isolément.
* **Mocker systématiquement** les dépendances externes (Prisma, MailService, Cloudinary/FileService).


2. **Tests E2E (`test/*.e2e-spec.ts`) :**
* Utiliser une base de données de test dédiée (Docker).
* **Reset DB** : La BDD doit être nettoyée avant chaque test (`prisma-test-helper`).
* **Override** : Il est **interdit** d'appeler de vraies APIs externes (Cloudinary, SMTP) en test E2E. Utiliser `.overrideProvider()` pour injecter des mocks.



---

## 3. 📱 Frontend (`apps/mobile`)

**Stack :** Expo (React Native), Expo Router, NativeWind (Tailwind).
**Imports :** Utilisation de l'alias `@/` pour pointer vers `src/`.
- **Services API :** Les appels API (`fetch` ou `axios`) doivent être encapsulés dans des services dédiés (ex: `auth.service.ts`), jamais directement dans les composants UI.
- **Navigation :** Basée sur les fichiers (`app/_layout.tsx`, `app/index.tsx`).

### Architecture des Dossiers (`src/`)

* **`components/ui`** : Design System "bête" (Boutons, Inputs, Cards).
* **`components/form`** : Wrappers pour React Hook Form (ex: `FormInput`).
* **`components/layouts`** : Structure globale (AppShell).
* **`services`** : Appels API (ex: `auth.service.ts`).
* **`stores`** : État global (Zustand).

### 🧭 Navigation & Layouts (Architecture Unifiée)

L'application utilise une approche **"AppShell"** pour garantir une expérience cohérente (Web vs Mobile) et respecter le principe DRY.

#### Le Composant `AppShell`

Situé dans `@/components/layouts/AppShell.tsx`, il est le parent obligatoire de tous les `_layout.tsx` (`(main)`, `(auth)`, `(dev)`). Il centralise :

1. **StatusBar :** Force le style `dark` (texte noir).
2. **Logique Utilisateur :** Récupère l'état d'authentification (`useAuthStore`).
3. **WebNavBar :** Gère l'affichage de la barre de navigation responsive.

#### Stratégie Responsive

L'`AppShell` accepte une prop `layoutType` :

* **`layoutType="main"`** (Accueil) :
* **Web :** Affiche la NavBar avec les liens.
* **Mobile :** Affiche la NavBar (avec Menu Burger) en haut + Tabs en bas. Le header natif est caché (`headerShown: false`).


* **`layoutType="subpage"`** (Auth/Dev/Détails) :
* **Web :** Affiche la NavBar.
* **Mobile :** **Cache** la NavBar pour laisser place au Header Natif (`Stack`) qui fournit la flèche "Retour".



#### Configuration des Liens (`src/config/navigation.ts`)

C'est la source de vérité unique pour les menus.

* Propriété **`hideInMobileDrawer: true`** :
* Si `true` : Le lien est caché du Menu Burger sur Mobile (car présent physiquement dans la Bottom Bar).
* Sur Web : Cette propriété est ignorée (le lien apparaît toujours dans la NavBar).



### 🎨 Design System Local (`@/components/ui`)

* Les composants UI de base se trouvent dans `src/components/ui`.
* **Agnostiques :** Ils ne contiennent **AUCUNE** logique métier ni appel API. Ils reçoivent des données (Props) et émettent des événements.
* **Robustesse :** Ils gèrent leurs états visuels via les props (ex: `error`, `isLoading`).

### 🧩 Form System (`@/components/form`)

Pour garder le Design System pur, la logique de connexion aux formulaires est isolée dans `src/components/form`.

#### `FormInput` (Wrapper Intelligent)

Ce composant agit comme un pont entre **React Hook Form** et le composant `Input` UI.

* **Rôle :** Connecte automatiquement `value`, `onChange`, `onBlur` et les erreurs (`errorMessage`).
* **Typage :** Utilise des génériques (`T extends FieldValues`) pour garantir que `name` correspond au schéma Zod.
* **Utilisation :**

```tsx
import { FormInput } from "@/components/form/form-input";

// ✅ CORRECT
<FormInput control={control} name="email" label="Email" />

// ❌ INTERDIT (Ne pas passer value/onChange manuellement)
<FormInput value={email} onChangeText={setEmail} ... />

```

---

## 4. 📝 Conventions de Code

### Commentaires & Documentation

* **Complexité :** Utiliser JSDoc `/** ... */` au-dessus des méthodes complexes.
* **Concision :** Pas de commentaires évidents.

### Nommage

* **Fichiers :** `kebab-case` (ex: `auth.service.ts`, `user-profile.tsx`).
* **Classes/Interfaces :** `PascalCase` (ex: `AuthService`, `LoginDto`).
* **Variables/Méthodes :** `camelCase` (ex: `uploadFile`, `isEmailValid`).
* **Pas de "Magic Numbers" :** Utiliser des constantes nommées.

### Sécurité

* **Validation :** Tout input API doit passer par un `ZodValidationPipe`.
* **Secrets :** Clés API et secrets JWT dans le `.env` uniquement.

---

## 5. 🛠️ Workflow de Développement

1. **Création d'une feature :**
* Définir le DTO dans `@repo/shared` (+ test).
* Implémenter le Backend (`apps/api`) (+ test unitaire & E2E).
* Si besoin d'UI, créer/mettre à jour le composant dans `apps/mobile/src/components/ui`.
* Implémenter l'écran et le service dans `apps/mobile`.


2. **Gestion des Assets :**
* Les icônes SVG sont gérées via `svgr` et `nativewind` (cssInterop) dans `AppShell` ou localement.
* Le stockage de fichiers est abstrait via `IFileService` (Back).



---

**Fin du contexte.**
Utilise ces informations pour générer du code cohérent avec l'existant.