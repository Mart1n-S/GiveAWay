import { Tabs, usePathname } from "expo-router";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/components/ui";
import {
  AppShell,
  HomeIcon,
  UserIcon,
  HandHeartIcon,
  BuildingIcon,
  MessageIcon,
} from "@/components/layouts/AppShell";
import { useAuthStore } from "@/stores/auth.store";
import { useMessageStore } from "@/stores/message.store";
import { useMessagingSocket } from "@/hooks/useMessagingSocket";

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

function AssociationsTabIcon({ color }: { readonly color: string }) {
  return <BuildingIcon className="w-7 h-7" color={color} />;
}

function MessagesTabIcon({ color }: { readonly color: string }) {
  const hasUnread = useMessageStore((s) => s.unreadCount > 0);
  return (
    <View style={{ width: 28, height: 28 }}>
      <MessageIcon className="w-7 h-7" color={color} />
      {hasUnread && (
        <View
          testID="messages-tab-dot"
          accessibilityLabel="Messages non lus"
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: colors.primary.default,
            borderWidth: 1.5,
            borderColor: "white",
          }}
        />
      )}
    </View>
  );
}

const MOBILE_SUBPAGE_ROUTES = new Set([
  "/association/modifier",
  "/association/membres",
  "/association/statistiques",
]);

function isMobileSubpageRoute(pathname: string): boolean {
  // Toutes les sous-pages profil (modifier, mot-de-passe, notifications, supprimer, abonnements, associations-aidees…)
  if (pathname.startsWith("/profil/")) return true;
  if (MOBILE_SUBPAGE_ROUTES.has(pathname)) return true;
  // Routes dynamiques : /missions/:id
  if (/^\/missions\/\d+/.test(pathname)) return true;
  // Profil public d'association : /associations/:id
  if (/^\/associations\/\d+/.test(pathname)) return true;
  // Toutes les sous-pages association/missions
  if (pathname.startsWith("/association/missions")) return true;
  // Discussion individuelle : /messages/:id
  if (/^\/messages\/\d+/.test(pathname)) return true;
  return false;
}

export default function MainLayout() {
  const insets = useSafeAreaInsets();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const pathname = usePathname();

  // Branche la socket dès que l'utilisateur est connecté
  useMessagingSocket();

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

        <Tabs.Screen
          name="associations"
          options={{
            title: "Associations",
            tabBarIcon: AssociationsTabIcon,
            href: Platform.OS === "web" ? undefined : null,
          }}
        />

        {/* Onglet Messages (connecté uniquement)
            La pastille de non-lus est rendue à l'intérieur de MessagesTabIcon
            (overlay sur l'icône) pour ne montrer qu'un point, sans nombre.
            popToTopOnBlur : quand on quitte l'onglet (ex : retour accueil),
            le stack interne est ramené à la racine — on revient donc sur la
            liste des conversations au prochain clic, plutôt que sur la
            conversation précédemment ouverte. */}
        {isAuthenticated ? (
          <Tabs.Screen
            name="messages"
            options={{
              title: "Messages",
              tabBarIcon: MessagesTabIcon,
              popToTopOnBlur: true,
            }}
          />
        ) : (
          <Tabs.Screen name="messages" options={{ href: null }} />
        )}

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
              title: "Mon Association",
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
