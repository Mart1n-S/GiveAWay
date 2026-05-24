# 🤝 Giveaway

> **Connecter ceux qui veulent aider avec ceux qui en ont besoin.**

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?style=for-the-badge&logo=turborepo&logoColor=white)
[![SonarQube Cloud](https://sonarcloud.io/images/project_badges/sonarcloud-light.svg)](https://sonarcloud.io/summary/new_code?id=Mart1n-S_GiveAWay)

---

## 📖 À propos

**Giveaway** est une plateforme innovante de mise en relation entre bénévoles et associations. Notre mission est de simplifier l'engagement associatif grâce à la technologie.

L'application repose sur un **algorithme de matching intelligent** qui propose des missions personnalisées en fonction de la localisation et des centres d'intérêt du bénévole, à la manière des applications de rencontre, mais pour la bonne cause.

### ✨ Fonctionnalités Clés (MVP)

- 🎯 **Matching Intelligent :** Algorithme de pertinence (Géolocalisation + Tags).
- 📱 **Expérience Mobile First :** Application fluide et intuitive (Expo / React Native).
- 🏢 **Espace Association :** Publication de missions et vérification d'identité (RNA).
- 💬 **Messagerie temps réel :** Conversations 1-à-1 entre bénévoles et membres d'associations, avec compteur de messages non lus et accusés de lecture (WebSocket).
- 🔔 **Notifications :** E-mails transactionnels (compte, missions inscrites) + opt-in (rappels J-1, nouvelles missions, suggestions personnalisées), push mobile via Expo.
- 🔒 **Architecture Sécurisée :** Séparation stricte Client/Serveur et base de données isolée.

---

## 🛠️ Stack Technique

Ce projet est conçu comme un **Monorepo** orchestré par **Turborepo**, garantissant une cohérence totale entre le Frontend et le Backend (partage de types TypeScript).

| Domaine          | Technologie             | Usage                                             |
| :--------------- | :---------------------- | :------------------------------------------------ |
| **Monorepo**     | **Turborepo**           | Orchestration du build et cache intelligent.      |
| **Langage**      | **TypeScript**          | Typage strict partagé (End-to-End Type Safety).   |
| **Mobile & Web** | **Expo (React Native)** | Application Cross-platform (iOS, Android, Web).   |
| **Routing**      | **Expo Router**         | Navigation basée sur les fichiers.                |
| **UI Framework** | **NativeWind (v4)**     | Styles utilitaires basés sur Tailwind CSS.        |
| **Forms**        | **React Hook Form**     | Gestion performante des formulaires & validation. |
| **Backend**      | **NestJS**              | Framework Node.js modulaire et robuste.           |
| **Data**         | **PostgreSQL + Prisma** | Base de données relationnelle et ORM moderne.     |
| **Temps réel**   | **Socket.IO**           | WebSocket pour la messagerie (typing, accusés de lecture, badges non lus). |
| **Infra (Dev)**  | **Docker**              | Conteneurisation de la BDD et outils d'admin.     |

---

## 📂 Structure du Projet

```text
Giveaway/
├── apps/
│   ├── api/          # Backend NestJS (Port 3000)
│   └── mobile/       # Application Expo iOS/Android/Web
│       ├── app/      # Navigation & Pages (Expo Router)
│       └── src/
│           ├── components/ # Design System & Wrappers de formulaires
│           ├── services/   # Appels API
│           └── stores/     # État global (Zustand)
├── packages/
│   └── shared/       # DTOs, Types et Interfaces partagés (Back & Front)
└── docker-compose.yml # Infrastructure locale (Postgres, Adminer)


```

---

## 🎨 Design System

L'interface utilisateur repose sur une bibliothèque de composants locale située dans `apps/mobile/src/components/ui`. Elle garantit une cohérence visuelle parfaite sur mobile et web.

Nous disposons actuellement de composants fondamentaux déclinés en plusieurs variantes et états (Hover, Active, Loading, Disabled, Error...) :

1. **Button :** Boutons primaires, secondaires, tertiaires avec gestion d'icônes et spinner de chargement.
2. **Input :** Champs de saisie avec icônes (gauche/droite), textes d'aide et validation d'erreurs.
3. **TextArea :** Zones de texte multi-lignes auto-extensibles avec compteurs de caractères.
4. **AppShell :** Structure globale gérant la navigation responsive (NavBar Web / Tabs Mobile).
5. **Messagerie :** Panneau de conversation avec bulles et accusés de lecture, liste des discussions, composer de message, picker de membre pour contacter une association.

### 🕹️ Documentation Interactive (Playground)

Une page "Design System" est intégrée à l'application. Elle est **accessible uniquement en mode développement** via le menu de navigation et permet de visualiser tous les composants en temps réel.

🔗 **Accès Web :** [http://localhost:8081/design-system](http://localhost:8081/design-system)

---

# 🚀 Démarrage Rapide

## 📦 Prérequis

- **Node.js** (v20+)
- **Docker** & **Docker Compose**

---

## 🛠️ Installation

### 1️⃣ Cloner le projet

```bash
git clone https://github.com/Mart1n-S/GiveAWay.git
cd GiveAWay
```

---

### 2️⃣ Configuration des variables d'environnement

Copier le fichier .env.example en .env et remplir les valeurs appropriées.
```bash
cp .env.example .env
```

## 📱 Configuration mobile

Vous devez également configurer les variables d’environnement pour l’application mobile :

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Ensuite, complétez les variables nécessaires.

---

## 🛠️ Configuration admin (Vite + React)

Copier le fichier d'exemple de la console d'administration :

```bash
cp apps/admin/.env.example apps/admin/.env
```

Variables disponibles dans `apps/admin/.env` :

- `VITE_API_URL` : URL de l'API NestJS (par défaut `http://localhost:3000`).

### Variables admin à ajouter dans le `.env` racine (consommé par l'API)

```env
JWT_ADMIN_ACCESS_SECRET=<random_long>
JWT_ADMIN_REFRESH_SECRET=<random_long>
JWT_ADMIN_ACCESS_EXPIRES_IN=15m
JWT_ADMIN_REFRESH_EXPIRES_IN=7d
ADMIN_LOGIN_URL=http://localhost:5173/login

CONTACT_ADMIN_EMAIL="contact.giiveaway@gmail.com"
CORS_ALLOWED_ORIGINS="https://nom-de-domaine.fr,https://sous-nom-de-domaine.fr"
ADMIN_BASE_URL="http://localhost:5173"
```

Pour `JWT_ADMIN_ACCESS_SECRET` et `JWT_ADMIN_REFRESH_SECRET`, générer **deux** secrets différents avec :

```bash
openssl rand -base64 62
```

> 👤 **Compte admin de test** (créé par le seed Prisma) : `admin@gmail.com` / `password`. C'est ce compte qui est utilisé par les tests E2E admin (`apps/admin/tests`).

---

Pour le `JWT_ACCESS_SECRET` et `JWT_REFRESH_SECRET`, générer des clés secrètes sécurisées différentes en utilisant la commande suivante 2 fois :
```bash
openssl rand -base64 62
```

Le .env.test est utilisé pour les tests d'intégration et ne nécessite pas de modification.

### 🔐 Configuration Google OAuth

Pour configurer l'authentification Google (Web, Android, iOS), suivre la documentation dédiée :

📄 **[OAuthGoogle.md](./OAuthGoogle.md)** - à la racine du projet

Elle explique comment créer les clients OAuth dans Google Cloud Console,
générer l'empreinte SHA-1 Android, récupérer le `google-services.json`
depuis Firebase et configurer les variables d'environnement associées.

> [!IMPORTANT]
> Si vous souhaitez simplement tester rapidement sans config complète :
>
> * Définissez au minimum une valeur dans le `.env` de `apps/mobile` aléatoire pour :
>
> ```env
> EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=demo-value
> ```
>
> Cela permet d’éviter les erreurs au lancement de l’app mobile.


### 💾 Stockage des fichiers (Images)

Le projet supporte deux modes de stockage pour les avatars et images :

- **Mode Local** (Recommandé pour le Dev) : Les images sont stockées dans le dossier `apps/api/uploads` et servies directement par l'API.
```bash
STORAGE_TYPE=local
```

- **Mode Cloudinary** (Recommandé pour la Prod) : Les images sont hébergées sur les serveurs de Cloudinary (CDN).
```bash
STORAGE_TYPE=cloudinary

CLOUDINARY_CLOUD_NAME=votre_cloud_name
CLOUDINARY_API_KEY=votre_api_key
CLOUDINARY_API_SECRET=votre_api_secret
```

_Si vous utilisez le mode local, vous pouvez laisser les variables Cloudinary vides._

### 📧 Service d'e-mails (Brevo)

Le projet utilise **Brevo** pour l'envoi des e-mails transactionnels (validation de compte, récupération de mot de passe).

1. Créez un compte gratuit sur [Brevo](https://onboarding.brevo.com/account/register).
2. Accédez à la section **SMTP & API** dans votre panel d'administration.
3. Récupérez votre **Clé API** et configurez les variables suivantes :
```bash
BREVO_API_KEY=votre_cle_api_xkeysib
MAIL_FROM_EMAIL=l_email_de_votre_compte_brevo
MAIL_FROM_NAME=GiveAway
```

*Note : L'adresse e-mail utilisée dans `MAIL_FROM_EMAIL` doit être celle configurée comme expéditeur validé sur votre compte Brevo.*
---

### 3️⃣ Installation et Build

Installez les dépendances :
```bash
npm install
```

Générez les clients Prisma :
```bash
npm run prisma:generate
```

Build de tous les packages :
```bash
npx turbo build --force
```

---

### 4️⃣ Lancement de l'Infrastructure (Bases de données)

Avant de démarrer l'application, vous devez lancer les conteneurs Docker pour PostgreSQL (BDD de développement et BDD de test) :

```bash
docker-compose up -d
```

> [!NOTE]
> Vous pouvez administrer les bases de données via **pgAdmin** à l'adresse suivante :
> [http://localhost:8080/browser/](http://localhost:8080/browser/)
>
> 📘 Consultez la documentation complète :
> [Gestion de la base de données](./apps/api/gestionDB.md)

### ▶️ Appliquer les migrations

Une fois les bases lancées, appliquez les migrations Prisma :

```bash
npm run db:migrate
```

---

### 5️⃣ Peupler la base de données (Seeds)

Pour commencer à travailler avec des données de test (utilisateurs, adresses, etc.), lancez la commande suivante depuis la racine du projet :

```bash
npm run db:seed
```

> [!WARNING]
> **Attention :** Cette commande effectue un **nettoyage complet (TRUNCATE)** de toutes les tables de votre base de données locale avant d'injecter les nouvelles données. Les IDs sont réinitialisés à 1. Utilisez-la uniquement en développement pour repartir sur une base propre.

Après cette étape, vous pouvez utiliser les **données de test**, notamment le compte utilisateur suivant :

> **Email :** `admin@gmail.com`
> 
> **Mot de passe :** `password`

Pour le reste il suffit de regarder le fichier `apps/api/prisma/seed.ts` pour voir les autres données pré-remplies (associations, missions, etc.).

---

### 6️⃣ Démarrer le développement

```bash
npm run dev
```

> [!NOTE]
> Cette commande lance le backend ET le frontend simultanément.
> Sur mobile, scannez le QR code avec **Expo Go** (Android/iOS).
> Si une page intermédiaire s'ouvre, cliquez sur **"Expo Go"** en bas de page.
---

### 7️⃣ Développement Web vs Mobile — URL de l'API

En développement standard, **laisser `EXPO_PUBLIC_API_URL` vide** dans `apps/mobile/.env`.
`axios.ts` détecte automatiquement la bonne URL selon la plateforme :

| Contexte                     | URL détectée              | Comment                                                  |
| ---------------------------- | ------------------------- | -------------------------------------------------------- |
| **Web (navigateur)**         | `http://localhost:3000`   | Détection automatique via `Platform.OS`                  |
| **Mobile Expo Go**           | `http://192.168.x.x:3000` | Détection automatique via `Constants.expoConfig.hostUri` |
| **Google Auth mobile (APK)** | `http://192.168.x.x:3000` | À définir manuellement dans `.env`                       |

> [!NOTE]
> Pour tester **Google Auth sur mobile physique** (APK Development Build uniquement),
> consulter la documentation dédiée : 📄 **[OAuthGoogle.md](./OAuthGoogle.md)**

---

## 🧹 Linting & Code Quality

Avant de committer votre code, pensez à vérifier les erreurs de linting :

```bash
npm run lint
```

Pour corriger automatiquement les erreurs détectées :

```bash
npm run lint -- --fix
```

> [!IMPORTANT]
> Les erreurs de linting **doivent être corrigées**, mais les warnings peuvent être tolérés et n'empêchent pas le commit.

---

## 🧪 Tests Backend (Jest)

A la racine du projet, exécuter les commandes suivantes pour lancer les tests unitaires et d'intégration sur l'ensemble des applications et packages :

```bash
npm run test
```

```bash
npm run test:e2e
```

## 📱 Tests Frontend & Mobile Web (Playwright)

Les tests Playwright simulent le parcours utilisateur complet dans un navigateur. Ils nécessitent que le Backend et le Frontend tournent en **Mode Test**.

#### 1. Préparation (Une seule fois)

Assurez-vous que la base de données de test est synchronisée :

```bash
npm run db:test:setup

```

#### 2. Lancement des services

Vous devez ouvrir deux terminaux pour faire tourner les applications :

- **Terminal A (API en mode test) :**
```bash
npm run start:test --workspace=apps/api
```
- **Terminal B (Web) :** 
```bash
npm run web --workspace=apps/mobile
```

#### 3. Exécution des tests Playwright

Une fois les services démarrés, lancez les tests depuis la racine :

| Commande                        | Description                                                   |
| ------------------------------- | ------------------------------------------------------------- |
| `npm run test:e2e:mobile`       | Lance tous les tests en mode "headless" (console).            |
| `npm run test:e2e:mobile:ui`    | Ouvre l'interface interactive de Playwright. |

> [!IMPORTANT]
> Ne lancez pas les tests e2e sur le serveur de développement standard (`npm run dev`).

---

## 🛠️ Tests Frontend Admin (Playwright)

Même principe que pour le mobile, mais avec la console d'administration **Vite + React** (port `5173`).

> ℹ️ Pas besoin de relancer `db:test:setup` : la commande `test:e2e:admin` exécute automatiquement un reset + seed (`pretest:e2e` du workspace admin) pour garantir la présence du compte admin de test (`admin@gmail.com / password`).

#### 1. Lancement des services

Deux terminaux :

- **Terminal A (API en mode test) :**
  ```bash
  npm run start:test --workspace=apps/api
  ```
- **Terminal B (Frontend Admin) :**
  ```bash
  npm run dev --workspace=apps/admin
  ```

#### 2. Exécution des tests
Une fois les services démarrés, lancez les tests depuis la racine :

| Commande                       | Description                                       |
| ------------------------------ | ------------------------------------------------- |
| `npm run test:e2e:admin`       | Lance tous les tests admin en headless.           |
| `npm run test:e2e:admin:ui`    | Ouvre l'interface interactive de Playwright.      |

---

### 💡 Astuces

Pour lancer un fichier de test spécifique :

```bash
npm run test:e2e --workspace=apps/mobile -- tests/profil/profil.spec.ts
npm run test:e2e --workspace=apps/admin -- tests/login.spec.ts
```

---

## 🔔 Tester le cron de rappels J-1

Le système envoie un rappel par e-mail (si `emailNotifications=true`) et un push mobile (si `pushToken` présent) **la veille à 9h Europe/Paris** pour chaque mission à laquelle l'utilisateur est inscrit. Plutôt que d'attendre l'heure du cron, un script CLI permet de déclencher manuellement le job :

```bash
# Depuis apps/api/ — utilise la date du jour (envoie les rappels pour demain)
npm run reminders:test --workspace=apps/api

# Simuler un déclenchement à une date précise (utile pour cibler une mission existante :
# passer la veille de sa startDate)
npm run reminders:test --workspace=apps/api -- --date=2026-05-19
```

> [!NOTE]
> Le script boot un `NestFactory.createApplicationContext` (pas de serveur HTTP) et appelle `MissionReminderService.sendReminders(date)`. Les e-mails partent réellement sur Brevo et les push sur Expo **sauf** si `NODE_ENV=test` ou `USE_DETERMINISTIC_OTP=true` → tout est alors juste loggé en console.

**Pour tester rapidement en local :**
1. `docker-compose up -d` puis `npm run dev`
2. Avec le compte de seed, activer `emailNotifications` dans le profil (`/profil/notifications`)
3. S'inscrire à une mission ayant `startDate` au lendemain
4. Lance `npm run reminders:test --workspace=apps/api`

---

## 🌐 Accès aux services

### 🚀 API (NestJS)

[http://localhost:3000](http://localhost:3000)

### 📱 Mobile (Expo Go)

Scannez le **QR Code affiché dans le terminal** avec **Expo Go** (Android/iOS).
Si une page intermédiaire s'ouvre à `/_expo/loading`, cliquez sur **"Expo Go"** en bas.

> [!NOTE]
> Pour tester **Google Auth sur mobile**, un APK Development Build est nécessaire.
> Consulter 📄 **[OAuthGoogle.md](./OAuthGoogle.md)** pour les instructions.

### 🖥️ Web (Expo)

[http://localhost:8081/](http://localhost:8081/)

---

# Schéma prévisionnel de la BDD

![Schéma prévisionnel de la BDD](.github/schemaPrevisonnelBDD.jpeg)
