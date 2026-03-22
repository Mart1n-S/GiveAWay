import { View } from "react-native";
import clsx from "clsx";
import { Text } from "../text/text";
import { TagBadgeProps } from "./tag-badge.types";

const sizeClasses = {
  sm: "px-2 py-1",
  md: "px-3 py-1.5",
  lg: "px-4 py-2",
};

const textSizeClasses = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
};

const variantClasses = {
  orange: { bg: "bg-badge-orange-bg", text: "text-badge-orange-text" },
  green: { bg: "bg-badge-green-bg", text: "text-badge-green-text" },
  blue: { bg: "bg-badge-blue-bg", text: "text-badge-blue-text" },
  red: { bg: "bg-badge-red-bg", text: "text-badge-red-text" },
  surface: { bg: "bg-badge-surface-bg", text: "text-badge-surface-text" },
};

/**
 * Badge pill pour afficher des étiquettes colorées.
 *
 * Variantes disponibles :
 * - `orange`  : causes, bénévolat (fond orange clair)
 * - `green`   : environnement, nature (fond vert clair)
 * - `blue`    : information, tech (fond bleu clair)
 * - `red`     : urgent, santé (fond rouge clair)
 * - `surface` : neutre, compétences (fond gris)
 *
 * @example
 * <TagBadge label="Écologie" variant="green" />
 * <TagBadge label="Solidarité" variant="orange" />
 * <TagBadge label="Informatique" variant="surface" size="sm" />
 */
export function TagBadge({
  label,
  variant = "surface",
  size = "md",
  className,
}: TagBadgeProps) {
  const { bg, text } = variantClasses[variant];

  return (
    <View className={clsx("rounded-lg", sizeClasses[size], bg, className)}>
      <Text className={clsx("font-semibold", textSizeClasses[size], text)}>
        {label}
      </Text>
    </View>
  );
}
