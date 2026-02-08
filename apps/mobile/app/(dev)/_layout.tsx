import { Stack, useRouter, usePathname } from "expo-router";
import { View, Platform } from "react-native";
import { cssInterop } from "nativewind";
import { WebNavBar, Logo, colors } from "@repo/ui";
import { StatusBar } from "expo-status-bar";

// --- STORES & CONFIG ---
import { useAuthStore } from "../../src/stores/auth.store";
import { AuthService } from "../../src/services/auth.service";

import {
  PUBLIC_LINKS,
  USER_LINKS,
  AUTH_ROUTES,
} from "../../src/config/navigation";

// --- IMPORTS ICONES ---
import GiveawayIconSource from "../../assets/icons/ic_giveaway.svg";
import MenuIconSource from "../../assets/icons/ic_menu.svg";
import CloseIconSource from "../../assets/icons/ic_close.svg";
import InfoIconSource from "../../assets/icons/ic_info.svg";
import HomeIconSource from "../../assets/icons/ic_home.svg";
import LogoutIconSource from "../../assets/icons/ic_logout.svg";
import UserIconSource from "../../assets/icons/ic_user.svg";
import SettingsIconSource from "../../assets/icons/ic_settings.svg";

// --- CSS INTEROP ---
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
const LogoutIcon = cssInterop(LogoutIconSource, iconConfig);
const UserIcon = cssInterop(UserIconSource, iconConfig);
const SettingsIcon = cssInterop(SettingsIconSource, iconConfig);

// Helper icône
const getIcon = (name: string | undefined, className = "w-5 h-5") => {
  switch (name) {
    case "home":
      return <HomeIcon className={className} />;
    case "user":
      return <UserIcon className={className} />;
    case "settings":
      return <SettingsIcon className={className} />;
    case "logout":
      return <LogoutIcon className={className} />;
    case "info":
      return <InfoIcon className={className} />;
    default:
      return <InfoIcon className={className} />;
  }
};

export default function DevLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const isWeb = Platform.OS === "web";

  // --- RECUPERATION DU STORE USER ---
  const { user, isAuthenticated } = useAuthStore();

  const handleLogout = async () => {
    await AuthService.logout();
    router.replace("/");
  };

  // Préparation de l'objet User pour la NavBar
  const navBarUser =
    isAuthenticated && user
      ? {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          initials:
            user.firstName && user.lastName
              ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
              : "??",
          avatarUrl: null,
        }
      : null;

  // --- 1. PRÉPARATION DES LIENS DU HAUT (Main) ---
  const mainLinks = [
    // Accueil en premier
    ...PUBLIC_LINKS.filter((l) => l.id === "home"),
    // Profil (si connecté, sauf settings)
    ...(isAuthenticated ? USER_LINKS.filter((l) => l.id !== "settings") : []),
    // Autres liens publics (Infos...)
    ...PUBLIC_LINKS.filter((l) => l.id !== "home"),
  ].map((link) => ({
    ...link,
    icon: getIcon(link.iconName),
    isActive: pathname === link.href,
  }));

  // --- 2. PRÉPARATION DES LIENS DU BAS (Paramètres) ---
  const bottomLinks = isAuthenticated
    ? USER_LINKS.filter((l) => l.id === "settings").map((link) => ({
        ...link,
        icon: getIcon(link.iconName),
        isActive: pathname === link.href,
      }))
    : [];

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      {/* --- WEB NAVBAR (Uniquement sur Web) --- */}
      {isWeb && (
        <WebNavBar
          user={navBarUser}
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
          mainLinks={mainLinks}
          bottomLinks={bottomLinks}
          secondaryLinks={[]}
          // Actions
          onLogoutPress={handleLogout}
          onProfilePress={() => router.push("/profil" as any)}
          onLoginPress={() => router.push(AUTH_ROUTES.login as any)}
          onRegisterPress={() => router.push(AUTH_ROUTES.register as any)}
          // Icône unique (blanche car bouton rouge)
          logoutIcon={<LogoutIcon className="w-5 h-5 text-white" />}
        />
      )}

      {/* --- STACK DE NAVIGATION --- */}
      <Stack
        screenOptions={{
          // Mobile: Header visible avec flèche retour
          // Web: Header caché (géré par WebNavBar)
          headerShown: !isWeb,
          headerBackTitle: "",
          headerTintColor: "#1F2937",
          headerTitleStyle: { fontWeight: "bold" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: "white" },
        }}
      >
        <Stack.Screen
          name="design-system"
          options={{ headerTitle: "Design System 🎨" }}
        />
      </Stack>
    </View>
  );
}
