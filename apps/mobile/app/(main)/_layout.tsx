import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/components/ui";

// On importe notre Shell et l'icône Home (exportée depuis AppShell)
import { AppShell, HomeIcon } from "@/components/layouts/AppShell";

export default function MainLayout() {
  const insets = useSafeAreaInsets();

  return (
    <AppShell layoutType="main">
      <Tabs
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

        {/* Ajouter les futurs liens de la BottomBar ici si nécessaire */}
      </Tabs>
    </AppShell>
  );
}
