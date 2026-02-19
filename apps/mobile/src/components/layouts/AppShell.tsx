import React, { ReactNode } from "react";
import { View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { cssInterop } from "nativewind";

// --- UI & CONFIG ---
import { WebNavBar, Logo } from "@/components/ui";
import { PUBLIC_LINKS, USER_LINKS, AUTH_ROUTES } from "../../config/navigation";
import { useAuthStore } from "../../stores/auth.store";
import { AuthService } from "../../services/auth.service";

// --- ASSETS (Centralisés une seule fois ici) ---
import GiveawayIconSource from "../../../assets/icons/ic_giveaway.svg";
import MenuIconSource from "../../../assets/icons/ic_menu.svg";
import CloseIconSource from "../../../assets/icons/ic_close.svg";
import HomeIconSource from "../../../assets/icons/ic_home.svg";
import LogoutIconSource from "../../../assets/icons/ic_logout.svg";
import UserIconSource from "../../../assets/icons/ic_user.svg";
import SettingsIconSource from "../../../assets/icons/ic_settings.svg";
import InfoIconSource from "../../../assets/icons/ic_info.svg";

// --- CONFIGURATION ICONES ---
const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

// On exporte les icônes pour pouvoir les utiliser dans les Tabs du MainLayout si besoin
export const GiveawayIcon = cssInterop(GiveawayIconSource, iconConfig);
export const MenuIcon = cssInterop(MenuIconSource, iconConfig);
export const CloseIcon = cssInterop(CloseIconSource, iconConfig);
export const HomeIcon = cssInterop(HomeIconSource, iconConfig);
export const LogoutIcon = cssInterop(LogoutIconSource, iconConfig);
export const UserIcon = cssInterop(UserIconSource, iconConfig);
export const SettingsIcon = cssInterop(SettingsIconSource, iconConfig);
export const InfoIcon = cssInterop(InfoIconSource, iconConfig);

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

interface AppShellProps {
  children: ReactNode;
  /**
   * 'main' = Barre affichée partout (Web + Mobile avec Burger).
   * 'subpage' = Barre affichée sur Web uniquement. Mobile utilise le header natif (Stack).
   */
  layoutType?: "main" | "subpage";
}

export function AppShell({ children, layoutType = "main" }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { user, isAuthenticated } = useAuthStore();

  const handleLogout = async () => {
    await AuthService.logout();
    router.replace("/");
  };

  const navBarUser =
    isAuthenticated && user
      ? {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          initials: user.firstName
            ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
            : "??",
          avatarUrl: null,
        }
      : null;

  // --- LOGIQUE UNIFIÉE DES LIENS ---
  const mainLinks = [
    ...PUBLIC_LINKS.filter((l) => l.id === "home"),
    ...(isAuthenticated ? USER_LINKS.filter((l) => l.id !== "settings") : []),
    ...PUBLIC_LINKS.filter((l) => l.id !== "home"),
  ]
    .filter((link) => {
      // Si c'est du mobile natif dans le layout Main, on applique le filtre drawer
      // Sinon (Web ou Subpage), on affiche tout ce qui est pertinent
      if (!isWeb && layoutType === "main" && link.hideInMobileDrawer)
        return false;
      return true;
    })
    .map((link) => {
      const cleanHref = link.href.replace(/\/\([^)]+\)/g, "");
      return {
        ...link,
        icon: getIcon(link.iconName),
        isActive: pathname === link.href || pathname === cleanHref,
      };
    });

  const bottomLinks = isAuthenticated
    ? USER_LINKS.filter((l) => l.id === "settings").map((link) => ({
        ...link,
        icon: getIcon(link.iconName),
        isActive: pathname === link.href,
      }))
    : [];

  // Est-ce qu'on doit afficher la NavBar ?
  // - Sur Web : TOUJOURS.
  // - Sur Mobile : SEULEMENT si layoutType === 'main'.
  const showNavBar = isWeb || layoutType === "main";

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      {showNavBar && (
        <View
          // Sur mobile, on ajoute le padding top safe area car on n'a pas de header natif
          style={{
            paddingTop: !isWeb && layoutType === "main" ? insets.top : 0,
          }}
          className="z-50 bg-white border-b border-grey-200"
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
      )}

      {/* CONTENU DE LA PAGE */}
      <View className="flex-1">{children}</View>
    </View>
  );
}
