import { Pressable, View, Image } from "react-native";
import clsx from "clsx";
import { Text } from "../text/text";
import { AvatarButtonProps } from "./avatar-button.types";

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
  xl: "w-24 h-24",
};

const textSizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-3xl",
};

export function AvatarButton({
  imageUrl,
  initials,
  isGuest = false,
  guestIcon,
  size = "md",
  className,
  readonly = false,
  ...props
}: AvatarButtonProps) {
  // L'élément est interactif SEULEMENT SI : il n'est pas readonly ET pas disabled
  const isInteractive = !readonly && !props.disabled;

  const avatarBaseUrl = process.env.EXPO_PUBLIC_API_URL_AVATAR ?? "";

  // 1. Calcul du label Accessibilité
  let defaultA11yLabel: string;
  if (isGuest) {
    defaultA11yLabel = "Menu profil, non connecté";
  } else {
    defaultA11yLabel = initials ? `Profil utilisateur ${initials}` : "Mon profil";
  }

  const renderContent = () => {
    // Cas 1 : Image
    if (!isGuest && imageUrl) {
      const isExternalOrLocalPath =
        imageUrl.startsWith("http://") ||
        imageUrl.startsWith("https://") ||
        imageUrl.startsWith("blob:") ||
        imageUrl.startsWith("file:") ||
        imageUrl.startsWith("data:");

      // Si c'est un de ces cas, on utilise imageUrl directement.
      // Sinon (ex: "avatars/user.jpg"), on préfixe.
        const uri = isExternalOrLocalPath
          ? imageUrl
          : `${avatarBaseUrl.replace(/\/$/, "")}/${imageUrl.replace(/^\//, "")}`;

      return (
        <Image
          source={{ uri }}
          className="w-full h-full"
          resizeMode="cover"
          accessibilityLabel=""
        />
      );
    }

    // Cas 2 : Initiales
    if (!isGuest && initials) {
      return (
        <View className="items-center justify-center w-full h-full bg-primary-100">
          <Text
            className={clsx(
              "font-bold text-primary-700",
              textSizeClasses[size],
            )}
            accessibilityElementsHidden={true}
            importantForAccessibility="no-hide-descendants"
          >
            {initials.substring(0, 2).toUpperCase()}
          </Text>
        </View>
      );
    }

    // Cas 3 : Guest
    return (
      <View className="items-center justify-center w-full h-full bg-grey-200">
        {guestIcon}
      </View>
    );
  };

  return (
    <Pressable
      {...props}
      // Désactive le clic natif si non interactif (readonly ou disabled)
      disabled={!isInteractive}
      // Si interactif : rôle bouton. Sinon : rôle image (pour l'accessibilité)
      accessibilityRole={isInteractive ? "button" : "image"}
      accessibilityLabel={props.accessibilityLabel || defaultA11yLabel}
      accessibilityState={{ disabled: !!props.disabled }}
      className={clsx(
        // --- BASE ---
        "rounded-full overflow-hidden border border-grey-200",
        "items-center justify-center transition-opacity",

        // --- INTERACTION ---
        // On applique les styles d'interaction UNIQUEMENT si isInteractive est true
        isInteractive && [
          "active:opacity-80 hover:opacity-80",
          "web:cursor-pointer",
          "focus:ring-2 focus:ring-focus focus:ring-offset-2",
          "web:focus:ring-0 web:focus:ring-offset-0",
          "web:outline-none",
          "web:focus-visible:ring-2 web:focus-visible:ring-focus web:focus-visible:ring-offset-2",
        ],

        // --- TAILLE & CUSTOM ---
        sizeClasses[size],
        className,
      )}
    >
      {renderContent()}
    </Pressable>
  );
}
