import { Pressable, View, ActivityIndicator } from "react-native";
import clsx from "clsx";
import { cssInterop } from "nativewind";
import { Text } from "../text/text";
import { colors } from "../theme/tokens";
import { ProfileActionRowProps } from "./profile-action-row.types";
import ChevronRightIconSource from "@assets/icons/ic_chevron_right.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const ChevronRightIcon = cssInterop(ChevronRightIconSource, iconConfig);

/**
 * Ligne d'action style "iOS Settings" pour la page profil.
 *
 * - `default` : texte gris foncé + chevron
 * - `danger`  : texte rouge + chevron rouge
 *
 * @example
 * <ProfileActionRow
 *   icon={<SettingsIcon />}
 *   label="Paramètres"
 *   onPress={() => {}}
 * />
 */
export function ProfileActionRow({
  icon,
  label,
  variant = "default",
  onPress,
  loading = false,
  className,
}: ProfileActionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      className={clsx(
        "group flex-row items-center justify-between px-4 py-4 bg-white transition-all",

        // --- ÉTATS DE FOND ---
        variant === "default" && "active:bg-grey-200 hover:bg-grey-50",
        variant === "danger" && "active:bg-red-200 hover:bg-red-50",
        "web:outline-none",
        "web:focus-visible:ring-2 web:focus-visible:ring-inset web:focus-visible:ring-focus web:focus-visible:z-10",

        loading && "opacity-60",
        className,
      )}
    >
      <View className="flex-row items-center gap-3">
        <View
          className={clsx(
            "transition-colors",
            variant === "default" && "text-grey-800 group-active:text-grey-900",
            variant === "danger" && "text-red-600 group-active:text-red-800",
          )}
        >
          {icon}
        </View>

        <Text
          className={clsx(
            "text-base font-semibold transition-colors",
            variant === "default" && "text-grey-800 group-active:text-grey-900",
            variant === "danger" && "text-red-600 group-active:text-red-800",
          )}
        >
          {label}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "danger" ? colors.red[600] : colors.grey[500]}
        />
      ) : (
        <ChevronRightIcon
          className={clsx(
            "w-5 h-5 transition-colors",
            variant === "default" && "text-grey-800 group-active:text-grey-900",
            variant === "danger" && "text-red-600 group-active:text-red-800",
          )}
        />
      )}
    </Pressable>
  );
}