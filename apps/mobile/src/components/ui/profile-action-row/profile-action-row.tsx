import { cloneElement, isValidElement, ReactElement } from "react";
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
  const iconColorClass = clsx(
    variant === "default" && "text-grey-800 group-active:text-grey-900",
    variant === "danger" && "text-red-600 group-active:text-red-800",
  );

  const getIconColor = (pressed: boolean) => {
    if (variant === "danger") {
      return pressed ? colors.red[800] : colors.red[600];
    }
    return pressed ? colors.grey[900] : colors.grey[800];
  };

  const renderedIcon = (pressed: boolean) => {
    if (!isValidElement(icon)) return null;
    return cloneElement(icon as ReactElement<{ className?: string }>, {
      className: clsx((icon.props as any).className, "w-5 h-5", iconColorClass),
    });
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      className={clsx(
        "group flex-row items-center justify-between px-4 py-4 bg-white transition-all",
        variant === "default" && "active:bg-grey-200 hover:bg-grey-50",
        variant === "danger" && "active:bg-red-200 hover:bg-red-50",
        "web:outline-none web:focus-visible:ring-2 web:focus-visible:ring-inset web:focus-visible:ring-focus web:focus-visible:z-10",
        loading && "opacity-60",
        className,
      )}
    >
      {({ pressed }) => (
        <>
          <View className="flex-row items-center gap-3">
            {renderedIcon(pressed) && (
              <View className="items-center justify-center w-5 h-5">
                {renderedIcon(pressed)}
              </View>
            )}
            <Text
              className={clsx(
                "text-base font-semibold transition-colors",
                iconColorClass,
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
              width={20}
              height={20}
              color={getIconColor(pressed)}
            />
          )}
        </>
      )}
    </Pressable>
  );
}