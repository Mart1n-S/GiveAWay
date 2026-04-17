import { Tabs, usePathname } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cssInterop } from "nativewind";
import { colors } from "@/components/ui";
import { AppShell, HomeIcon, UserIcon, HandHeartIcon } from "@/components/layouts/AppShell";
import { useAuthStore } from "@/stores/auth.store";

import BuildingIconSource from "@assets/icons/ic_building.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const BuildingIcon = cssInterop(BuildingIconSource, iconConfig);

function HomeTabIcon({ color }: { readonly color: string }) {
  return <HomeIcon className="w-7 h-7" color={color} />;
}

function MissionsTabIcon({ color }: { readonly color: string }) {
  return <HandHeartIcon className="w-7 h-7" color={color} />;
}

function ProfilTabIcon({ color }: { readonly color: string }) {
  return <UserIcon className="w-7 h-7" color={color} />;
}

function AssociationTabIcon({ color }: { readonly color: string }) {
  return <BuildingIcon className="w-7 h-7" color={color} />;
}

const MOBILE_SUBPAGE_ROUTES = new Set([
  "/profil/modifier",
  "/profil/mot-de-passe",
  "/profil/notifications",
  "/association/modifier",
  "/association/membres",
]);

function isMobileSubpageRoute(pathname: string): boolean {
  if (MOBILE_SUBPAGE_ROUTES.has(pathname)) return true;
  // Routes dynamiques : /missions/:id
  if (/^\/missions\/\d+/.test(pathname)) return true;
  return false;
}

export default function MainLayout() {
  const insets = useSafeAreaInsets();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const pathname = usePathname();

  const isMobileSubpage =
    Platform.OS !== "web" && isMobileSubpageRoute(pathname);

  const hasAssociation =
    isAuthenticated &&
    Array.isArray(user?.associations) &&
    user.associations.length > 0;

  return (
    <AppShell layoutType={isMobileSubpage ? "subpage" : "main"}>
      <Tabs
        // On ajoute une "key" dynamique basée sur l'auth.
        // Si l'état change, React détruit et recrée proprement les onglets.
        key={isAuthenticated ? "auth-tabs" : "public-tabs"}
        screenOptions={{
          // On cache le header natif des Tabs, car AppShell affiche la WebNavBar en haut
          headerShown: false,

          // --- BOTTOM BAR (MOBILE ONLY) ---
          tabBarActiveTintColor: colors.primary.default,
          tabBarInactiveTintColor: colors.grey[400],
          headerShadowVisible: false,
          //   Si on veux masquer les labels sous les icônes, on peut décommenter cette ligne :
          //   tabBarShowLabel: false,
          tabBarStyle:
            Platform.OS === "web"
              ? { display: "none" }
              : {
                  height: 60 + insets.bottom,
                  paddingBottom: insets.bottom,
                  paddingTop: 10,
                  backgroundColor: "white",
                  borderTopWidth: 1,
                  borderTopColor: colors.grey[200],
                },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Accueil",
            tabBarIcon: HomeTabIcon,
          }}
        />

        <Tabs.Screen
          name="missions"
          options={{
            title: "Missions",
            tabBarIcon: MissionsTabIcon,
          }}
        />

        {/* Onglet Profil (connecté uniquement) */}
        {isAuthenticated ? (
          <Tabs.Screen
            name="profil"
            options={{
              title: "Profil",
              tabBarIcon: ProfilTabIcon,
            }}
          />
        ) : (
          /* Optionnel : On peut cacher explicitement l'onglet s'il n'est pas connecté 
             pour éviter qu'Expo Router ne garde un lien mort */
          <Tabs.Screen
            name="profil"
            options={{
              href: null, // Cache l'onglet si non connecté
            }}
          />
        )}

        {/* Onglet Association (connecté + membre d'une association) */}
        {hasAssociation ? (
          <Tabs.Screen
            name="association"
            options={{
              title: "Association",
              tabBarIcon: AssociationTabIcon,
            }}
          />
        ) : (
          <Tabs.Screen
            name="association"
            options={{
              href: null, // Cache l'onglet si pas d'association
            }}
          />
        )}
        {/* Ajouter les futurs liens de la BottomBar ici si nécessaire */}
      </Tabs>
    </AppShell>
  );
}
