export interface NavLink {
  id: string;
  label: string;
  href: string;
  iconName?:
    | "home"
    | "info"
    | "user"
    | "settings"
    | "logout"
    | "hand-heart"
    | "gestion"
    | "building"
    | "associations"
    | "message";
  isDestructive?: boolean;
  /** Masque l'item dans le drawer mobile natif (BottomBar s'en charge déjà). */
  hideInMobileDrawer?: boolean;
  /** Masque l'item dans la barre de navigation web desktop (accessible
   *  ailleurs, ex: avatar en haut à droite). Présent quand même dans le
   *  burger mobile/tablette pour ne pas perdre le lien. */
  hideInWebNav?: boolean;
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
    id: "missions",
    label: "Missions",
    href: "/missions",
    iconName: "hand-heart",
    // Présent dans la BottomBar mobile → on le cache du burger pour éviter
    // le doublon. Sur web, ce flag est ignoré (cf. AppShell.tsx).
    hideInMobileDrawer: true,
  },
  {
    id: "associations",
    // Libellé explicite pour ne pas être confondu avec "Mon Association"
    // (gestion) dans la BottomBar mobile et la nav web.
    label: "Trouver une association",
    href: "/associations",
    iconName: "building",
  },
];

// --- AJOUT SPÉCIFIQUE DÉVELOPPEMENT ---
// TODO: Supprimer ces liens avant la production, ils sont là pour faciliter le développement et les tests de certaines fonctionnalités (ex: notifications push)
// TODO: Activer pour le dev
// if (__DEV__) {
//   PUBLIC_LINKS.push({
//     id: "design-system",
//     label: "Design System 🎨",
//     href: "/design-system",
//     iconName: "settings",
//   },
//   {
//     id: "notifications",
//     label: "Notifications 🔔",
//     href: "/notifications",
//     iconName: "settings",
//   });
// }

// 2. LIENS UTILISATEUR (Visibles uniquement si connecté)
export const USER_LINKS: NavLink[] = [
  {
    id: "profile",
    label: "Mon Profil",
    href: "/profil",
    iconName: "user",
    hideInMobileDrawer: true,
    // Sur web desktop, l'avatar dans le coin haut-droit redirige déjà vers
    // le profil → on retire le doublon de la nav principale pour gagner
    // de la place. Reste accessible via le burger sur tablette/mobile web.
    hideInWebNav: true,
    testID: "link-profile",
  },
  {
    id: "messages",
    label: "Messages",
    href: "/messages",
    iconName: "message",
    hideInMobileDrawer: true,
    testID: "link-messages",
  },
  {
    id: "association",
    label: "Mon Association",
    href: "/association",
    iconName: "building",
    hideInMobileDrawer: true,
    testID: "link-association",
  },
  {
    id: "gestion-des-missions",
    label: "Gestion des Missions",
    href: "/association/missions",
    iconName: "gestion",
  },
];

// 3. LIENS D'AUTH
export const AUTH_ROUTES = {
  login: "/connexion",
  register: "/inscription",
};
