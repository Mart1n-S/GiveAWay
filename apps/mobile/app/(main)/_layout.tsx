import { Tabs, useRouter, usePathname } from "expo-router";
import { View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { cssInterop } from "nativewind";
import { WebNavBar, Logo, colors } from "@repo/ui";

import { useAuthStore } from "../../src/stores/auth.store";
import { AuthService } from "../../src/services/auth.service";

import {
  PUBLIC_LINKS,
  USER_LINKS,
  AUTH_ROUTES,
} from "../../src/config/navigation";

import GiveawayIconSource from "../../assets/icons/ic_giveaway.svg";
import MenuIconSource from "../../assets/icons/ic_menu.svg";
import CloseIconSource from "../../assets/icons/ic_close.svg";
import HomeIconSource from "../../assets/icons/ic_home.svg";
import LogoutIconSource from "../../assets/icons/ic_logout.svg";
import UserIconSource from "../../assets/icons/ic_user.svg";
import SettingsIconSource from "../../assets/icons/ic_settings.svg";
import InfoIconSource from "../../assets/icons/ic_info.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const GiveawayIcon = cssInterop(GiveawayIconSource, iconConfig);
const MenuIcon = cssInterop(MenuIconSource, iconConfig);
const CloseIcon = cssInterop(CloseIconSource, iconConfig);
const HomeIcon = cssInterop(HomeIconSource, iconConfig);
const LogoutIcon = cssInterop(LogoutIconSource, iconConfig);
const UserIcon = cssInterop(UserIconSource, iconConfig);
const SettingsIcon = cssInterop(SettingsIconSource, iconConfig);
const InfoIcon = cssInterop(InfoIconSource, iconConfig);

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

export default function MainLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuthStore();
  const isWeb = Platform.OS === "web";

  const handleLogout = async () => {
    await AuthService.logout();
    router.replace("/");
  };

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
  ]
    .filter((link) => {
      // Sur mobile (app native), on cache l'accueil du menu car il est dans la BottomBar
      if (!isWeb && link.hideInMobileDrawer) return false;
      return true;
    })
    .map((link) => ({
      ...link,
      icon: getIcon(link.iconName),
      isActive: pathname === link.href,
    }));

  // --- 2. PRÉPARATION DES LIENS DU BAS (Settings) ---
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
      <Tabs
        screenOptions={{
          // --- HEADER COMMUN (WEB & MOBILE) ---
          header: () => (
            <View
              style={{ paddingTop: insets.top }}
              className="bg-white border-b border-grey-200"
            >
              <WebNavBar
                user={navBarUser}
                className="border-b-0"
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
                onLogoutPress={handleLogout}
                logoutIcon={<LogoutIcon className="w-5 h-5 text-white" />}
                onProfilePress={() => router.push("/profil" as any)}
                onLoginPress={() => router.push(AUTH_ROUTES.login as any)}
                onRegisterPress={() => router.push(AUTH_ROUTES.register as any)}
              />
            </View>
          ),

          // --- BOTTOM BAR (MOBILE APP ONLY) ---
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
    </View>
  );
}
