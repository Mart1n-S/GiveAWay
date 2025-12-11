# 🤝 Giveaway

> **Connecter ceux qui veulent aider avec ceux qui en ont besoin.**

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?style=for-the-badge&logo=turborepo&logoColor=white)

---

## 📖 À propos

**Giveaway** est une plateforme innovante de mise en relation entre bénévoles et associations. Notre mission est de simplifier l'engagement associatif grâce à la technologie.

L'application repose sur un **algorithme de matching intelligent** qui propose des missions personnalisées en fonction de la localisation et des centres d'intérêt du bénévole, à la manière des applications de rencontre, mais pour la bonne cause.

### ✨ Fonctionnalités Clés (MVP)
* 🎯 **Matching Intelligent :** Algorithme de pertinence (Géolocalisation + Tags).
* 📱 **Expérience Mobile First :** Application fluide et intuitive (Expo / React Native).
* 🏢 **Espace Association :** Publication de missions et vérification d'identité (RNA).
* 🔒 **Architecture Sécurisée :** Séparation stricte Client/Serveur et base de données isolée.

---

## 🛠️ Stack Technique

Ce projet est conçu comme un **Monorepo** orchestré par **Turborepo**, garantissant une cohérence totale entre le Frontend et le Backend (partage de types TypeScript).

| Domaine          | Technologie             | Usage                                           |
| :--------------- | :---------------------- | :---------------------------------------------- |
| **Monorepo**     | **Turborepo**           | Orchestration du build et cache intelligent.    |
| **Langage**      | **TypeScript**          | Typage strict partagé (End-to-End Type Safety). |
| **Mobile & Web** | **Expo (React Native)** | Application Cross-platform (iOS, Android, Web). |
| **UI Framework** | **NativeWind (v4)**     | Styles utilitaires basés sur Tailwind CSS.      |
| **Backend**      | **NestJS**              | Framework Node.js modulaire et robuste.         |
| **Data**         | **PostgreSQL + Prisma** | Base de données relationnelle et ORM moderne.   |
| **Infra (Dev)**  | **Docker**              | Conteneurisation de la BDD et outils d'admin.   |

---

## 📂 Structure du Projet

```text
Giveaway/
├── apps/
│   ├── api/          # Backend NestJS (Port 3000)
│   └── mobile/       # Application Expo iOS/Android/Web
├── packages/
│   └── shared/       # DTOs, Types et Interfaces partagés
└── docker-compose.yml # Infrastructure locale (Postgres, Adminer)

```
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
````

---

### 2️⃣ Installer les dépendances

```bash
npm install
```

---

### 3️⃣ Démarrer le développement

```bash
npm run dev
```

---

## 🌐 Accès aux services

### 🚀 API (NestJS)

[http://localhost:3000](http://localhost:3000)

### 📱 Mobile (Expo)

Scannez le **QR Code affiché dans le terminal** avec **Expo Go** (iOS/Android)

---
