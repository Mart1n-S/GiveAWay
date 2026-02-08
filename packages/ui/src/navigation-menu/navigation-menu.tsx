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
  onLoginPress,
  onRegisterPress,
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
        contentContainerStyle={{ paddingBottom: 40 }}
        className="flex-1"
      >
        {/* --- HEADER (User ou Guest) --- */}
        <View className="px-6 pt-8 pb-6 border-b border-grey-100">
          {isGuestMode ? (
            <View className="gap-3">
              <Text className="mb-1 text-xl font-bold text-grey-900">
                Bienvenue sur GiveAWay !
              </Text>
              <Text className="mb-4 text-sm text-grey-500">
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
                {user?.email && (
                  <Text className="text-sm text-grey-500" numberOfLines={1}>
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
          <View className="h-px mx-6 my-2 bg-grey-100" />
        )}

        {secondaryLinks.length > 0 && (
          <View className="gap-1 px-4 py-4">
            {secondaryLinks.map((link) => renderItem(link))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
