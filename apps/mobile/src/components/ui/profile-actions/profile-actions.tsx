import { View, Pressable } from "react-native";
import clsx from "clsx";
import { cssInterop } from "nativewind";
import { Button } from "../button/button";
import { Text } from "../text/text";
import { ProfileActionRow } from "../profile-action-row/profile-action-row";
import { ProfileActionsProps } from "./profile-actions.types";

import EditIconSource from "@assets/icons/ic_edit.svg";
import LogoutIconSource from "@assets/icons/ic_logout.svg";
import TrashIconSource from "@assets/icons/ic_trash.svg";
import SettingsIconSource from "@assets/icons/ic_settings.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const EditIcon = cssInterop(EditIconSource, iconConfig);
const LogoutIcon = cssInterop(LogoutIconSource, iconConfig);
const TrashIcon = cssInterop(TrashIconSource, iconConfig);
const SettingsIcon = cssInterop(SettingsIconSource, iconConfig);

/**
 * Section actions du profil bénévole.
 *
 * Affiche :
 * - Bouton "Modifier le profil" (primary, pleine largeur)
 * - Liste d'actions style iOS Settings :
 *   - Paramètres de confidentialité (default)
 *   - Déconnexion (danger)
 * - Bouton "Supprimer le compte" (tertiary danger, texte seul)
 *
 * @example
 * <ProfileActions
 *   isGoogleAccount={!user.hasPassword}
 *   onEditPress={() => router.push('/profil/modifier')}
 *   onLogoutPress={handleLogout}
 *   onDeletePress={() => router.push('/profil/supprimer')}
 * />
 */
export function ProfileActions({
  onEditPress,
  onLogoutPress,
  onDeletePress,
  isLoggingOut = false,
  className,
}: ProfileActionsProps) {
  return (
    <View className={clsx("gap-6", className)}>
      <Button
        onPress={onEditPress}
        icon={<EditIcon className="w-5 h-5 text-white" />}
        className="w-full shadow-sm"
      >
        Modifier le profil
      </Button>

      <View className="overflow-hidden bg-white border rounded-md shadow-sm border-grey-200">
        <ProfileActionRow
          icon={<SettingsIcon className="w-5 h-5" />}
          label="Paramètres de confidentialité"
          onPress={() => {}}
        />

        {/* Séparateur plus subtil */}
        <View className="h-[1px] ml-12 bg-grey-100" />

        <ProfileActionRow
          icon={<LogoutIcon className="w-5 h-5" />}
          label="Déconnexion"
          variant="danger"
          onPress={onLogoutPress}
          loading={isLoggingOut}
        />
      </View>

      <Pressable
        onPress={onDeletePress}
        accessibilityRole="button"
        className={clsx(
          "group h-control w-full rounded-md flex-row items-center justify-center gap-2 transition-all mt-8",
          "border border-transparent",
          "hover:bg-red-50 active:bg-red-100",
          "web:outline-none web:focus-visible:ring-2 web:focus-visible:ring-red-500 web:focus-visible:ring-offset-2",
        )}
      >
        <TrashIcon
          className={clsx(
            "w-4 h-4 transition-colors",
            "text-red-600 group-active:text-red-900",
          )}
        />
        <Text
          className={clsx(
            "text-sm font-bold tracking-tight transition-colors",
            "text-red-600 group-active:text-red-900",
          )}
        >
          Supprimer le compte
        </Text>
      </Pressable>
    </View>
  );
}