export interface NavLink {
  id: string;
  label: string;
  href: string;
  iconName?: "home" | "info" | "user" | "settings" | "logout";
  isDestructive?: boolean;
  hideInMobileDrawer?: boolean;
  testID?: string;
}

// 1. LIENS PUBLICS
export const PUBLIC_LINKS: NavLink[] = [
  {
    id: "home",
    label: "Accueil",
    href: "/",
    iconName: "home",
    hideInMobileDrawer: true,
  },
  {
    id: "how-it-works",
    label: "Comment ça marche ?",
    href: "/a-propos", // TODO: Page à créer
    iconName: "info",
  },
];

// --- AJOUT SPÉCIFIQUE DÉVELOPPEMENT ---
// TODO: Supprimer ces liens avant la production, ils sont là pour faciliter le développement et les tests de certaines fonctionnalités (ex: notifications push)
if (__DEV__) {
  PUBLIC_LINKS.push({
    id: "design-system",
    label: "Design System 🎨",
    href: "/design-system",
    iconName: "settings",
  },
  {
    id: "notifications",
    label: "Notifications 🔔",
    href: "/notifications",
    iconName: "settings",
  });
}

// 2. LIENS UTILISATEUR (Visibles uniquement si connecté)
export const USER_LINKS: NavLink[] = [
  {
    id: "profile",
    label: "Mon Profil",
    href: "/profil",
    iconName: "user",
    hideInMobileDrawer: true,
    testID: "link-profile",
  },
  {
    id: "settings",
    label: "Paramètres",
    href: "/parametres", // TODO: Page à créer
    iconName: "settings",
  },
];

// 3. LIENS D'AUTH
export const AUTH_ROUTES = {
  login: "/connexion",
  register: "/inscription",
};
