import { useMemo, cloneElement, isValidElement, ReactElement } from "react";
import { Pressable, View } from "react-native";
import clsx from "clsx";
import { Text } from "../text/text";
import { MenuItemProps } from "./menu-item.types";

export function MenuItem({
  label,
  icon,
  rightIcon,
  isActive = false,
  isDestructive = false,
  className,
  disabled,
  ...props
}: MenuItemProps) {

  const iconColorClass = clsx(
    disabled && "text-grey-disabledText",

    !disabled &&
      isDestructive &&
      "text-white group-active:text-white group-hover:text-white",
    !disabled && isDestructive && !isActive && "text-error-strong",
    !disabled && !isDestructive && isActive && "text-primary-active",
    !disabled &&
      !isDestructive &&
      !isActive &&
      "text-grey-700 group-active:text-primary-active group-hover:text-primary-hover",
  );

  const renderedIcon = useMemo(() => {
    if (!isValidElement(icon)) return null;
    return cloneElement(icon as ReactElement<{ className?: string }>, {
      className: clsx((icon.props as any).className, iconColorClass),
    });
  }, [icon, iconColorClass]);

  const renderedRightIcon = useMemo(() => {
    if (!isValidElement(rightIcon)) return null;
    const rightIconClass = clsx(
      disabled && "text-grey-disabledText",
      !disabled &&
        isDestructive &&
        "text-white group-active:text-white group-hover:text-white",
      !disabled && !isDestructive && isActive && "text-primary-active",
      !disabled &&
        !isDestructive &&
        !isActive &&
        "text-grey-600 group-active:text-primary-active group-hover:text-primary-hover",
    );

    return cloneElement(rightIcon as ReactElement<{ className?: string }>, {
      className: clsx((rightIcon.props as any).className, rightIconClass),
    });
  }, [rightIcon, disabled, isDestructive, isActive]);

  return (
    <Pressable
      {...props}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!isActive, disabled: !!disabled }}
      className={clsx(
        "group flex-row items-center justify-between w-full px-4 py-3 rounded-lg",

        isDestructive
          ? "bg-red-600 active:bg-red-800 hover:bg-red-700"
          : isActive
            ? "bg-white-active"
            : "bg-transparent active:bg-white-active hover:bg-white-hover",

        "web:outline-none",
        isDestructive
          ? "web:focus-visible:ring-2 web:focus-visible:ring-red-600 web:focus-visible:ring-offset-2"
          : "web:focus-visible:ring-2 web:focus-visible:ring-focus web:focus-visible:ring-inset",

        disabled && "opacity-50 web:cursor-not-allowed",
        className,
      )}
    >
      <View className="flex-row items-center gap-3">
        {/* Icône Gauche */}
        {renderedIcon && (
          <View className="items-center justify-center w-5 h-5">
            {renderedIcon}
          </View>
        )}

        {/* Label */}
        <Text
          className={clsx(
            "text-base font-medium",
            iconColorClass,
          )}
        >
          {label}
        </Text>
      </View>

      {/* Icône Droite */}
      {renderedRightIcon && (
        <View className="items-center justify-center">{renderedRightIcon}</View>
      )}
    </Pressable>
  );
}
