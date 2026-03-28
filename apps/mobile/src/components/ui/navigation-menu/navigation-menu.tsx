import { View, ScrollView } from "react-native";
import { Link } from "expo-router";
import clsx from "clsx";
import { Text } from "../text/text";
import { MenuItem } from "../menu-item/menu-item";
import { AvatarButton } from "../avatar-button/avatar-button";
import { Button } from "../button/button";
import { NavigationMenuProps, MenuLink } from "./navigation-menu.types";

export function NavigationMenu({
  user,
  isGuest = false,
  mainLinks,
  secondaryLinks = [],
  bottomLinks = [],
  onLoginPress,
  onRegisterPress,
  onLogoutPress,
  logoutIcon,
  className,
  style,
  ...props
}: NavigationMenuProps) {
  // On détermine si on est vraiment en mode invité
  const isGuestMode = isGuest || !user;

  // --- HELPER : Rendu d'un lien (avec ou sans href) ---
  const renderItem = (link: MenuLink) => {
    // Le contenu visuel (Le MenuItem)
    const menuItem = (
      <MenuItem
        key={link.href ? undefined : link.id}
        label={link.label}
        icon={link.icon}
        rightIcon={link.rightIcon}
        isActive={link.isActive}
        isDestructive={link.isDestructive}
        disabled={link.disabled}
        onPress={link.onPress}
        testID={link.testID}
      />
    );

    // Si c'est un lien Web (href présent)
    if (link.href) {
      return (
        <Link key={link.id} href={link.href} asChild>
          {menuItem}
        </Link>
      );
    }

    // Sinon c'est un bouton classique
    return menuItem;
  };

  return (
    <View
      className={clsx("flex-1 bg-white w-full h-full", className)}
      style={style}
      {...props}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        className="flex-1"
      >
        {/* --- HEADER (User ou Guest) --- */}
        <View className="px-6 pt-8 pb-6 border-b border-grey-100">
          {isGuestMode ? (
            <View className="gap-3">
              <Text className="mb-1 text-xl font-bold text-grey-900">
                Bienvenue sur GiveAWay !
              </Text>
              <Text className="mb-4 text-sm text-grey-600">
                Connectez-vous pour accéder à toutes les fonctionnalités.
              </Text>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Button
                    variant="primary"
                    onPress={onLoginPress}
                    className="w-full"
                  >
                    Connexion
                  </Button>
                </View>
                <View className="flex-1">
                  <Button
                    variant="secondary"
                    onPress={onRegisterPress}
                    className="w-full"
                  >
                    S'inscrire
                  </Button>
                </View>
              </View>
            </View>
          ) : (
            <View className="flex-row items-center gap-4">
              <AvatarButton
                imageUrl={user?.avatarUrl}
                initials={user?.initials || user?.name?.substring(0, 2)}
                size="lg"
                readonly
              />
              <View className="flex-1">
                <Text
                  className="text-lg font-bold text-grey-900"
                  numberOfLines={1}
                >
                  {user?.name}
                </Text>
                {!!user?.email && (
                  <Text className="text-sm text-grey-600" numberOfLines={1}>
                    {user?.email}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* --- LISTE PRINCIPALE --- */}
        <View className="gap-1 px-4 py-4">
          {mainLinks.map((link) => renderItem(link))}
        </View>

        {/* --- LISTE SECONDAIRE --- */}
        {secondaryLinks.length > 0 && (
          <>
            <View className="h-px mx-6 my-2 bg-grey-100" />
            <View className="gap-1 px-4 py-4">
              {secondaryLinks.map((link) => renderItem(link))}
            </View>
          </>
        )}

        <View className="flex-1" />

        {/* --- FOOTER (Bottom Links + Logout) --- */}
        {(bottomLinks.length > 0 || (!isGuestMode && onLogoutPress)) && (
          <View className="px-4 pb-2 mt-4">
            {/* Separator Line */}
            <View className="w-full h-px mb-4 bg-grey-200" />

            <View className="gap-1">
              {/* Bottom Links (e.g., Settings) */}
              {bottomLinks.map((link) => renderItem(link))}

              {/* Logout Button */}
              {!isGuestMode && onLogoutPress && (
                <MenuItem
                  label="Se déconnecter"
                  icon={logoutIcon}
                  isDestructive
                  onPress={onLogoutPress}
                />
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
