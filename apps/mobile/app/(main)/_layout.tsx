import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/components/ui";
import { AppShell, HomeIcon, UserIcon } from "@/components/layouts/AppShell";
import { useAuthStore } from "@/stores/auth.store";

export default function MainLayout() {
  const insets = useSafeAreaInsets();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <AppShell layoutType="main">
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
          //   Si on veuxait masquer les labels sous les icônes, on peut décommenter cette ligne :
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
            tabBarIcon: ({ color }) => (
              <HomeIcon className="w-7 h-7" color={color} />
            ),
          }}
        />

        {/* On ne rend le Screen que si on est connecté */}
        {isAuthenticated ? (
          <Tabs.Screen
            name="profil"
            options={{
              title: "Profil",
              tabBarIcon: ({ color }) => (
                <UserIcon className="w-7 h-7" color={color} />
              ),
            }}
          />
        ) : (
          /* Optionnel : On peut cacher explicitement l'onglet s'il n'est pas connecté 
             pour éviter qu'Expo Router ne garde un lien mort */
          <Tabs.Screen
            name="profil"
            options={{
              href: null, // Cette ligne cache l'onglet physiquement de la barre
            }}
          />
        )}
        {/* Ajouter les futurs liens de la BottomBar ici si nécessaire */}
      </Tabs>
    </AppShell>
  );
}
