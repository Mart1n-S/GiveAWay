# 🔐 Configuration Google OAuth - GiveAWay

Ce document explique comment configurer l'authentification Google pour
les trois plateformes (Web, Android, iOS).

---

## Prérequis

- Un compte [Google Cloud Console](https://console.cloud.google.com)
- Un compte [Expo](https://expo.dev) - créer un compte gratuit si besoin
- EAS CLI installé : `npm install -g eas-cli`
- Être invité sur l'organisation Expo **giveaway-team** (demander à @mart1ndev)

---

## Étape 1 - Google Cloud Console

### 1.1 Créer un projet

1. Aller sur [console.cloud.google.com](https://console.cloud.google.com)
2. Créer un nouveau projet ou utiliser le projet GiveAWay existant
3. Activer l'**API Google+ / People API** si demandé

### 1.2 Écran de consentement OAuth

1. Menu → **APIs & Services** → **Écran de consentement OAuth**
2. Type d'utilisateur : **Externe**
3. Remplir le nom de l'app (`GiveAWay`), l'email de support
4. Sauvegarder

> 💡 Les scopes `openid`, `email` et `profile` sont normalement activés par défaut,
> aucune configuration supplémentaire n'est nécessaire.

<img src=".github/doc/oauth/etape1.png" width="500"/>

<img src=".github/doc/oauth/etape2.png" width="500"/>

### 1.3 Créer les clients OAuth (Menu → Clients)
Obtenir les Client IDs pour les trois plateformes

#### Client Web

| Champ                          | Valeur                                              |
| ------------------------------ | --------------------------------------------------- |
| Type                           | Application Web                                     |
| Nom                            | `GiveAWay Web`                                      |
| Origines JavaScript autorisées | `http://localhost:8081`                             |
| URIs de redirection autorisés  | `http://localhost:8081`                             |
| URIs de redirection autorisés  | `https://auth.expo.io/@giveaway-team/mobile`        |

> [!NOTE]
> L'URI de redirection `https://auth.expo.io/@giveaway-team/mobile` est liée à
> l'organisation Expo **giveaway-team**. Ne pas modifier cette valeur.

#### Client Android

| Champ           | Valeur                                |
| --------------- | ------------------------------------- |
| Type            | Android                               |
| Nom             | `GiveAWay Android`                    |
| Nom du package  | `com.googleoauth`                     |
| Empreinte SHA-1 | *(voir section 2 - Générer le SHA-1)* |

#### Client iOS

| Champ        | Valeur            |
| ------------ | ----------------- |
| Type         | iOS               |
| Nom          | `GiveAWay iOS`    |
| ID du bundle | `com.googleoauth` |

---

## Étape 2 - Générer l'empreinte SHA-1 (Android)

L'empreinte SHA-1 est nécessaire pour le client Android.
Elle est liée à ton compte Expo - chaque développeur doit générer la sienne.
```bash
# Se connecter à Expo avec ton compte personnel
eas login

# Générer les credentials Android (crée automatiquement le keystore et le SHA-1)
eas credentials --platform android
```

Copie le SHA-1 affiché et colle-le dans le client Android de Google Console.

---

## Étape 3 - Firebase (google-services.json)

Le fichier `google-services.json` n'est **pas commité** dans le repo (données sensibles).
Il doit être téléchargé depuis Firebase Console par chaque développeur.

1. Aller sur [console.firebase.google.com](https://console.firebase.google.com)
2. Sélectionner le projet GiveAWay (lié au même projet Google Cloud)
3. **Paramètres du projet** (⚙️) → **Général** → section **Vos applications**
4. Sélectionner l'app Android → **Ajouter une empreinte** → coller ton SHA-1
5. Télécharger `google-services.json`
6. Placer le fichier dans `apps/mobile/google-services.json`

---

## Étape 4 - Variables d'environnement

### Backend (`/.env` à la racine)
```dotenv
GOOGLE_CLIENT_WEB_ID=<web_client_id>
GOOGLE_IOS_CLIENT_ID=<ios_client_id>
GOOGLE_ANDROID_CLIENT_ID=<android_client_id>
```

### Frontend (`/apps/mobile/.env`)
```dotenv
# ---------------------------------------------------------------
# URL de l'API backend
# ---------------------------------------------------------------
# Laisser vide en développement standard (Expo Go + Web) :
#   - Web (navigateur) → http://localhost:3000 (auto)
#   - Mobile Expo Go   → IP locale via Constants.expoConfig.hostUri (auto)
#
# Pour tester Google Auth mobile (APK Development Build) :
#   → Décommenter la ligne avec l'IP locale de ta machine
#   → Lancer : npm run dev:native (depuis apps/mobile)
#
# EXPO_PUBLIC_API_URL=http://192.168.x.x:3000
#
# En production :
# EXPO_PUBLIC_API_URL=https://api.ton-domaine.com
# ---------------------------------------------------------------
EXPO_PUBLIC_API_URL=

EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web_client_id>
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<android_client_id>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<ios_client_id>
EXPO_PUBLIC_GOOGLE_USERINFO_URL=https://www.googleapis.com/oauth2/v3/userinfo
```

---

## Étape 5 - Configuration `app.config.js`

Le projet utilise `app.config.js` à la place de `app.json` pour gérer
dynamiquement les plugins natifs selon l'environnement.

La variable `EXPO_NATIVE_BUILD=true` active les plugins natifs
(`expo-dev-client`, `@react-native-google-signin/google-signin`).
Elle est injectée automatiquement par les scripts npm - **ne pas modifier**.

**Ne pas modifier ces valeurs dans `app.config.js` :**
- `owner` : `giveaway-team`
- `projectId` : `8ec15cbb-f3af-4dbe-ae4b-48c7bea59faf`
- `iosUrlScheme` : `com.googleusercontent.apps.533720849177-xxx`

L'`iosUrlScheme` est le Client ID iOS **inversé** :
- Client ID iOS : `533720849177-xxx.apps.googleusercontent.com`
- iosUrlScheme : `com.googleusercontent.apps.533720849177-xxx`

---

## Étape 6 - Builder l'app Android pour les tests

> [!WARNING]
> Le development build est nécessaire pour tester *Google Auth* sur mobile.
> Expo Go ne supporte pas les schemes custom utilisés par Google OAuth.

### 6.1 Se connecter à Expo
```bash
eas login
# Se connecter avec ton compte Expo personnel
# Tu dois avoir accepté l'invitation de l'organisation giveaway-team
```

### 6.2 Uploader le google-services.json sur EAS
⚠️ Pour l'organisation giveaway-team, cela a déjà été fait pas besoin de la recréer.
Le fichier `google-services.json` doit être uploadé comme variable secrète
sur EAS pour être disponible lors du build cloud :
```bash
cd apps/mobile
eas env:create
# Répondre aux questions :
# - Name        : GOOGLE_SERVICES_JSON
# - Type        : file
# - Value       : chemin vers ./google-services.json
# - Visibility  : secret
# - Environment : development (et preview, production)
```

> [!NOTE]
> Cette étape est à faire une seule fois par projet.
> Si la variable existe déjà, passe directement à l'étape 6.3.

### 6.3 Lancer le build
```bash
cd apps/mobile
eas build --profile development --platform android
```

- Le build se fait dans le cloud (~15 min sur le plan gratuit)
- Un QR code apparaît à la fin - scanne-le avec ton téléphone pour télécharger l'APK
- Installe l'APK sur ton téléphone Android

### 6.4 Lancer le serveur de développement

Dans un terminal - Backend :
```bash
npm run dev --workspace=apps/api
```

Dans un autre terminal - Frontend (depuis `apps/mobile`) :
```bash
npm run dev:native
```

> [!NOTE]
> `npm run dev:native` est équivalent à `cross-env EXPO_NATIVE_BUILD=true expo start --dev-client --host lan`
> Il active automatiquement les plugins natifs Google Auth.

---

## Récapitulatif des fichiers sensibles

| Fichier                | Commité ? | Où le récupérer                  |
| ---------------------- | --------- | -------------------------------- |
| `google-services.json` | ❌ Non     | Firebase Console                 |
| `/.env`                | ❌ Non     | Google Cloud Console + collègues |
| `/apps/mobile/.env`    | ❌ Non     | Google Cloud Console + collègues |
| `app.config.js`        | ✅ Oui     | Dans le repo                     |
| `eas.json`             | ✅ Oui     | Dans le repo                     |

---

## En résumé pour un nouveau développeur

### Dev quotidien (sans Google Auth mobile)
```bash
# Depuis la racine
npm run dev
# → Backend sur localhost:3000
# → Frontend Expo Go sur http://192.168.x.x:8081
# → Scanne le QR code avec Expo Go
```

> [!NOTE]
> En mode dev quotidien, Google Auth fonctionne sur **web** mais pas sur mobile
> (Expo Go ne supporte pas les modules natifs). Pour le développement standard,
> utilisez l'authentification email/password sur mobile.

### Tester Google Auth mobile (APK Development Build)

> [!WARNING]
> Ce mode est uniquement nécessaire pour tester **Google Auth sur téléphone**.
> Il a un effet de bord : l'authentification Google **ne fonctionne plus sur web**
> tant que `EXPO_PUBLIC_API_URL` pointe vers l'IP locale au lieu de `localhost`.
> Pensez à remettre `EXPO_PUBLIC_API_URL=` (vide) après vos tests.

```bash
# 1. Dans apps/mobile/.env, décommenter et adapter l'IP :
# EXPO_PUBLIC_API_URL=http://192.168.x.x:3000
#    → Remplace x.x par l'IP locale de ta machine
#    → ipconfig (Windows) ou ifconfig (Mac/Linux)

# 2. Terminal 1 — Backend
npm run dev --workspace=apps/api

# 3. Terminal 2 — Frontend (depuis apps/mobile)
npm run dev:native
# → Ouvre l'APK installé sur ton téléphone et scanne le QR code
# → L'APK est disponible sur expo.dev (organisation giveaway-team)
```