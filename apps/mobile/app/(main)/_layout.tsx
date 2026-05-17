import { Tabs, usePathname, router } from "expo-router";
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
  return <HomeIcon className="w-6 h-6" color={color} />;
}

function MissionsTabIcon({ color }: { readonly color: string }) {
  return <HandHeartIcon className="w-6 h-6" color={color} />;
}

function ProfilTabIcon({ color }: { readonly color: string }) {
  return <UserIcon className="w-6 h-6" color={color} />;
}

function AssociationTabIcon({ color }: { readonly color: string }) {
  return <BuildingIcon className="w-6 h-6" color={color} />;
}

function AssociationsTabIcon({ color }: { readonly color: string }) {
  return <BuildingIcon className="w-6 h-6" color={color} />;
}

function MessagesTabIcon({ color }: { readonly color: string }) {
  const hasUnread = useMessageStore((s) => s.unreadCount > 0);
  return (
    <View style={{ width: 24, height: 24 }}>
      <MessageIcon className="w-6 h-6" color={color} />
      {hasUnread && (
        <View
          testID="messages-tab-dot"
          accessibilityLabel="Messages non lus"
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            width: 9,
            height: 9,
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
                  // BottomBar plus compacte : on réduit la hauteur et le
                  // padding interne pour gagner en respiration. Combiné aux
                  // icônes 24px et au label compact, jusqu'à 5 tabs tiennent
                  // confortablement sur un écran 320px.
                  height: 56 + insets.bottom,
                  paddingBottom: insets.bottom,
                  paddingTop: 6,
                  backgroundColor: "white",
                  borderTopWidth: 1,
                  borderTopColor: colors.grey[200],
                },
          tabBarLabelStyle: {
            fontSize: 11,
            marginTop: 2,
            fontWeight: "500",
          },
          tabBarItemStyle: {
            paddingVertical: 0,
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

            tabPress listener : à chaque clic sur l'onglet (même si déjà
            focus), on force la navigation vers /messages (la liste). Évite
            que le tab garde l'écran de conversation précédent au retour. */}
        {isAuthenticated ? (
          <Tabs.Screen
            name="messages"
            options={{
              title: "Messages",
              tabBarIcon: MessagesTabIcon,
              popToTopOnBlur: true,
            }}
            listeners={() => ({
              tabPress: () => {
                // On laisse le tab changer (pas de preventDefault), mais on
                // force ensuite la nav vers la racine du stack messages.
                // setTimeout pour que ça s'exécute APRÈS le focus du tab.
                setTimeout(() => router.replace("/messages"), 0);
              },
            })}
          />
        ) : (
          <Tabs.Screen name="messages" options={{ href: null }} />
        )}

        {/* Onglet Association (connecté + membre d'une association).
            Placé AVANT Profil pour avoir un ordre cohérent en BottomBar :
            Accueil · Missions · Messages · Association · Profil. */}
        {hasAssociation ? (
          <Tabs.Screen
            name="association"
            options={{
              title: "Mon Association",
              // Label court côté BottomBar pour rentrer sans truncate.
              tabBarLabel: "Association",
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

        {/* Onglet Profil (connecté uniquement) — toujours en dernier */}
        {isAuthenticated ? (
          <Tabs.Screen
            name="profil"
            options={{
              title: "Profil",
              tabBarIcon: ProfilTabIcon,
            }}
          />
        ) : (
          <Tabs.Screen
            name="profil"
            options={{
              href: null, // Cache l'onglet si non connecté
            }}
          />
        )}
        {/* Ajouter les futurs liens de la BottomBar ici si nécessaire */}
      </Tabs>
    </AppShell>
  );
}
