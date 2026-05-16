import { useState, useEffect, useRef } from "react";
import {
  View,
  Pressable,
  Modal,
  Animated,
  Dimensions,
  Easing,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import clsx from "clsx";
import { Text } from "../text/text";
import { Button } from "../button/button";
import { AvatarButton } from "../avatar-button/avatar-button";
import { NavigationMenu } from "../navigation-menu/navigation-menu";
import { useMediaQuery } from "../hooks/use-media-query";
import { WebNavBarProps } from "./web-nav-bar.types";

export function WebNavBar({
  user,
  mainLinks,
  secondaryLinks,
  bottomLinks = [],
  onLoginPress,
  onRegisterPress,
  onProfilePress,
  onLogoutPress,
  logoComponent,
  menuIcon,
  closeIcon,
  logoutIcon,
  className,
  ...props
}: WebNavBarProps) {
  const { isDesktop } = useMediaQuery();

  // State principal de contrôle
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // State interne pour garder le Modal monté pendant l'animation de sortie
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Dimensions & Animation
  const windowWidth = Dimensions.get("window").width;
  const drawerWidth = Math.min(windowWidth * 0.85, 320);

  // Refs d'animation
  const slideAnim = useRef(new Animated.Value(drawerWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // --- GESTION DES ANIMATIONS ---
  useEffect(() => {
    if (isMenuOpen) {
      setIsModalVisible(true);
      slideAnim.setValue(drawerWidth);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      if (!isModalVisible) return;
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(slideAnim, {
          toValue: drawerWidth,
          duration: 250,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => setIsModalVisible(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMenuOpen, drawerWidth]);

  const renderDesktopLinks = () => {
    const allLinks = [...mainLinks, ...bottomLinks];
    return (
      <View className="flex-row items-center gap-1" accessibilityRole="menubar">
        {allLinks.map((link) => {
          const isPageActive = link.isActive;
          const hasUnread = (link.badgeCount ?? 0) > 0;
          const content = (
            <Pressable
              key={link.id}
              onPress={link.onPress}
              accessibilityRole="menuitem"
              accessibilityState={{ selected: isPageActive }}
              testID={link.testID}
              className={clsx(
                // `relative` pour positionner la pastille absolue en haut à droite
                "relative px-4 py-2 rounded-md transition-all duration-200 flex-row items-center",
                "hover:bg-primary-50 active:bg-primary-100",
                "web:outline-none focus:outline-none",
                "web:focus-visible:ring-2 web:focus-visible:ring-focus web:focus-visible:ring-offset-2",
              )}
            >
              <Text
                className={clsx(
                  "text-sm font-semibold transition-colors",
                  isPageActive
                    ? "text-primary-active underline decoration-2 underline-offset-8 decoration-primary-active"
                    : "text-grey-900 hover:text-primary-hover active:text-primary-active",
                )}
              >
                {link.label}
              </Text>
              {hasUnread && (
                <View
                  testID={`${link.testID ?? link.id}-dot`}
                  accessibilityLabel="Messages non lus"
                  className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary"
                />
              )}
            </Pressable>
          );
          return link.href ? (
            <Link key={link.id} href={link.href} asChild>
              {content}
            </Link>
          ) : (
            content
          );
        })}
      </View>
    );
  };

  // --- RENDER : ACTIONS (Desktop Right) ---
  const renderDesktopActions = () => {
    if (user) {
      return (
        <View className="flex-row items-center gap-4">
          <Pressable
            onPress={onProfilePress}
            className={clsx(
              "flex-row items-center gap-3 group rounded-full",
              "web:outline-none web:focus-visible:ring-2 web:focus-visible:ring-focus web:focus-visible:ring-offset-2",
              "web:cursor-pointer",
            )}
            accessibilityRole="button"
            accessibilityLabel="Ouvrir mon profil"
            testID="btn-profile-nav"
          >
            {isDesktop && (
              <View className="items-end">
                <Text className="text-sm font-bold transition-colors text-grey-900 group-hover:text-primary-hover">
                  {user.name}
                </Text>
              </View>
            )}
            <AvatarButton
              initials={user.initials}
              imageUrl={user.avatarUrl}
              size="md"
              readonly
            />
          </Pressable>

          <View className="h-6 w-[1px] bg-grey-300" />

          <Button
            onPress={onLogoutPress}
            icon={logoutIcon}
            className="text-white bg-red-600 border-red-600 hover:bg-red-700 hover:border-red-700 active:bg-red-800"
          >
          </Button>
        </View>
      );
    }
    return (
      <View className="flex-row items-center gap-3">
        <Button variant="tertiary" onPress={onLoginPress}>
          Connexion
        </Button>
        <Button variant="primary" onPress={onRegisterPress}>
          S'inscrire
        </Button>
      </View>
    );
  };

  return (
    <>
      <View
        className={clsx(
          "w-full h-16 bg-white border-b border-grey-200 px-4 md:px-8 z-50 flex-row items-center justify-between",
          className,
        )}
        accessibilityRole="header"
        {...props}
      >
        <View className="flex-shrink-0">{logoComponent}</View>
        {isDesktop && (
          <View className="absolute left-0 right-0 items-center justify-center pointer-events-none">
            <View className="pointer-events-auto">{renderDesktopLinks()}</View>
          </View>
        )}
        <View>
          {isDesktop ? (
            renderDesktopActions()
          ) : (
            <Button
              variant="tertiary"
              icon={menuIcon}
              onPress={() => setIsMenuOpen(true)}
              accessibilityLabel="Ouvrir le menu principal"
              testID="button-menu"
            />
          )}
        </View>
      </View>

      {/* --- MODAL MENU MOBILE --- */}
      {!isDesktop && (
        <Modal
          visible={isModalVisible}
          transparent={true}
          animationType="none"
          onRequestClose={() => setIsMenuOpen(false)}
        >
          <View className="z-50 flex-1">
            <Animated.View
              style={{
                opacity: fadeAnim,
                backgroundColor: "rgba(0,0,0,0.5)",
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            >
              <Pressable
                style={{ flex: 1 }}
                onPress={() => setIsMenuOpen(false)}
                accessibilityLabel="Fermer le menu"
              />
            </Animated.View>
            <Animated.View
              style={{
                transform: [{ translateX: slideAnim }],
                width: drawerWidth,
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                height: "100%",
                backgroundColor: "white",
                shadowColor: "#000",
                shadowOffset: { width: -2, height: 0 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
                elevation: 5,
              }}
            >
              <SafeAreaView className="flex-1">
                <View
                  className="flex-row items-center justify-between h-16 px-4 border-b border-grey-100"
                  accessibilityRole="header"
                >
                  {logoComponent}
                  <Button
                    variant="secondary"
                    icon={closeIcon}
                    onPress={() => setIsMenuOpen(false)}
                    accessibilityLabel="Fermer le menu"
                    className="!rounded-full"
                  />
                </View>

                <NavigationMenu
                  user={user}
                  isGuest={!user}
                  mainLinks={mainLinks.map((link) => ({
                    ...link,
                    onPress: () => {
                      setIsMenuOpen(false);
                      link.onPress?.();
                    },
                  }))}
                  secondaryLinks={secondaryLinks}
                  bottomLinks={bottomLinks}
                  onLoginPress={() => {
                    setIsMenuOpen(false);
                    onLoginPress?.();
                  }}
                  onRegisterPress={() => {
                    setIsMenuOpen(false);
                    onRegisterPress?.();
                  }}
                  onLogoutPress={() => {
                    setIsMenuOpen(false);
                    onLogoutPress?.();
                  }}
                  logoutIcon={logoutIcon}
                />
              </SafeAreaView>
            </Animated.View>
          </View>
        </Modal>
      )}
    </>
  );
}
