import { View, Pressable } from "react-native";
import clsx from "clsx";
import { cssInterop } from "nativewind";
import { Button } from "@/components/ui/button/button";
import { Text } from "@/components/ui/text/text";
import { ProfileActionRow } from "@/components/ui/profile-action-row/profile-action-row";
import { colors } from "@/components/ui/theme/tokens";
import type { ProfileActionsProps } from "./profile-actions.types";
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
        testID="btn-edit-profile"
      >
        Modifier le profil
      </Button>

      <View className="overflow-hidden bg-white border rounded-md shadow-sm border-grey-200">
        <ProfileActionRow
          icon={<SettingsIcon />}
          label="Paramètres de confidentialité"
          onPress={() => {}}
          testID="btn-privacy-settings"
        />

        {/* Séparateur plus subtil */}
        <View className="h-[1px] ml-12 bg-grey-100" />

        <ProfileActionRow
          icon={<LogoutIcon />}
          label="Déconnexion"
          variant="danger"
          onPress={onLogoutPress}
          loading={isLoggingOut}
          testID="btn-logout"
        />
      </View>

      <Pressable
        onPress={onDeletePress}
        accessibilityRole="button"
        className={clsx(
          "h-control w-full rounded-md flex-row items-center justify-center gap-2 transition-all mt-8",
          "border border-transparent",
          "hover:bg-red-50 active:bg-red-200",
          "web:outline-none web:focus-visible:ring-2 web:focus-visible:ring-red-500 web:focus-visible:ring-offset-2",
        )}
        testID="btn-delete-account"
      >
        {({ pressed }) => (
          <>
            <TrashIcon
              width={16}
              height={16}
              color={pressed ? colors.red[900] : colors.red[600]}
            />
            <Text
              className="text-sm font-bold tracking-tight"
              style={{ color: pressed ? colors.red[900] : colors.red[600] }}
            >
              Supprimer le compte
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}