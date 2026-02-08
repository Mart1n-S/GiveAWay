import { Stack, useRouter, usePathname } from "expo-router";
import { View, Platform } from "react-native";
import { cssInterop } from "nativewind";
import { StatusBar } from "expo-status-bar";
import { WebNavBar, Logo } from "@repo/ui";
import { PUBLIC_LINKS, AUTH_ROUTES } from "../../src/config/navigation";

import GiveawayIconSource from "../../assets/icons/ic_giveaway.svg";
import MenuIconSource from "../../assets/icons/ic_menu.svg";
import CloseIconSource from "../../assets/icons/ic_close.svg";
import InfoIconSource from "../../assets/icons/ic_info.svg";
import HomeIconSource from "../../assets/icons/ic_home.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const GiveawayIcon = cssInterop(GiveawayIconSource, iconConfig);
const MenuIcon = cssInterop(MenuIconSource, iconConfig);
const CloseIcon = cssInterop(CloseIconSource, iconConfig);
const InfoIcon = cssInterop(InfoIconSource, iconConfig);
const HomeIcon = cssInterop(HomeIconSource, iconConfig);

// Helper icône
const getIcon = (
  name: string | undefined,
  className = "w-5 h-5",
) => {
  switch (name) {
    case "home":
      return <HomeIcon className={className} />;
    case "info":
      return <InfoIcon className={className} />;
    default:
      return <InfoIcon className={className} />;
  }
};

export default function AuthLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const isWeb = Platform.OS === "web";

  // --- PRÉPARATION DES LIENS ---
  const navLinks = PUBLIC_LINKS.map((link) => {
    const cleanHref = link.href.replace(/\/\([^)]+\)/g, "");

    return {
      ...link,
      isActive: pathname === link.href || pathname === cleanHref,
      icon: getIcon(link.iconName),
    };
  });

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      {/* 1. WEB NAVBAR (Uniquement sur Web) */}
      {isWeb && (
        <WebNavBar
          user={null}
          logoComponent={
            <Logo
              size="md"
              icon={
                <GiveawayIcon className="w-full h-full text-primary-default" />
              }
            />
          }
          menuIcon={
            <MenuIcon className="w-6 h-6 text-grey-800 group-hover:text-primary-hover group-active:text-primary-active" />
          }
          closeIcon={
            <CloseIcon className="w-6 h-6 text-primary group-hover:text-primary-hover group-active:text-primary-active" />
          }
          mainLinks={navLinks}
          bottomLinks={[]}
          secondaryLinks={[]}
          onLoginPress={() => router.push(AUTH_ROUTES.login as any)}
          onRegisterPress={() => router.push(AUTH_ROUTES.register as any)}
        />
      )}

      {/* 2. STACK DE NAVIGATION */}
      <Stack
        screenOptions={{
          // --- MOBILE : Header Natif ---
          headerShown: !isWeb,
          headerBackTitle: "",
          headerTintColor: "#1F2937",
          headerTitleStyle: { fontWeight: "bold" },
          headerTitle: "",
          headerShadowVisible: false,
          contentStyle: { backgroundColor: "white" },
        }}
      >
        <Stack.Screen name="connexion" options={{ headerTitle: "Connexion" }} />
        <Stack.Screen
          name="inscription"
          options={{ headerTitle: "Inscription" }}
        />
      </Stack>
    </View>
  );
}
