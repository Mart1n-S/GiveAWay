import { useState, useRef, useId } from "react";
import {
  View,
  TextInput,
  Text,
  Pressable,
  Platform,
  TextInputProps,
  ViewStyle,
} from "react-native";
import clsx from "clsx";
import { colors } from "../theme/tokens";
import { InputProps } from "./input.types";

const isWeb = Platform.OS === "web";

export function Input({
  id,
  label,
  helperText,
  errorMessage,
  error = false,
  disabled = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerClassName,
  className,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const isError = error || !!errorMessage;

  // ---------- IDs ----------
  const uniqueId = useId();
  const inputId = id ?? `input-${uniqueId}`;
  const labelId = `${inputId}-label`;
  const helperTextId = `${inputId}-helper`;
  const errorTextId = `${inputId}-error`;

  // ---------- Handlers ----------
  const handleFocus: NonNullable<TextInputProps["onFocus"]> = (e) => {
    if (disabled) return;
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur: NonNullable<TextInputProps["onBlur"]> = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleLabelPress = () => {
    if (!disabled) inputRef.current?.focus();
  };

  const rightIconLabel =
    props.accessibilityLabel ??
    (typeof label === "string" ? `${label} – action` : "Action sur le champ");

  // Web-only style
  const webStyle = Platform.select({
    web: { outlineStyle: "none" },
    default: {},
  }) as ViewStyle;

  return (
    <View className={clsx("flex-col gap-1.5 w-full", containerClassName)}>
      {/* ---------- LABEL ---------- */}
      {label && (
        <Text
          nativeID={labelId}
          onPress={handleLabelPress}
          className={clsx(
            "text-sm font-semibold",
            isError ? "text-error-100" : "text-grey-800",
            isWeb && !disabled && "cursor-pointer",
            isWeb && disabled && "cursor-not-allowed"
          )}
        >
          {label}
        </Text>
      )}

      {/* ---------- INPUT CONTAINER ---------- */}
      <View
        className={clsx(
          // Base SAFE mobile
          "h-control flex-row items-center rounded-md border px-3 gap-2",

          // Web animation only
          isWeb && "transition-all",

          // Couleurs
          disabled
            ? "bg-grey-100 border-grey-600"
            : [
                "bg-white",
                isError
                  ? "border-error-100"
                  : isFocused
                    ? "border-primary"
                    : "border-grey-600",
              ],

          // Focus ring (WEB ONLY)
          isWeb &&
            !disabled &&
            isFocused && [
              "ring-2 ring-focus",
              "ring-offset-2 ring-offset-white",
            ],

          // Hover (WEB ONLY)
          isWeb && !disabled && !isError && !isFocused && "hover:border-primary"
        )}
      >
        {/* ---------- LEFT ICON ---------- */}
        {leftIcon && (
          <View
            className={clsx(disabled ? "opacity-100" : "text-grey-700")}
            accessibilityRole="image"
          >
            {leftIcon}
          </View>
        )}

        {/* ---------- TEXT INPUT ---------- */}
        <TextInput
          ref={inputRef}
          {...props}
          nativeID={inputId}
          accessibilityLabelledBy={labelId}
          aria-describedby={clsx(
            helperText && helperTextId,
            errorMessage && errorTextId
          )}
          editable={!disabled}
          selectTextOnFocus={!disabled}
          placeholderTextColor={colors.grey[700]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={webStyle}
          className={clsx(
            "flex-1 h-full bg-transparent p-0 border-0 text-base font-sans",
            isWeb && "outline-none",
            disabled ? "text-grey-disabledText" : "text-grey-800",
            className
          )}
        />

        {/* ---------- RIGHT ICON ---------- */}
        {rightIcon &&
          (onRightIconPress && !disabled ? (
            <Pressable
              onPress={onRightIconPress}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={rightIconLabel}
              className={clsx(
                "items-center justify-center rounded",
                isWeb &&
                  "outline-none focus:outline-none focus-visible:outline-none",
                isWeb &&
                  "focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
              )}
            >
              {rightIcon}
            </Pressable>
          ) : (
            <View
              className={clsx(disabled ? "opacity-100" : "text-grey-700")}
              accessibilityRole="image"
            >
              {rightIcon}
            </View>
          ))}
      </View>

      {/* ---------- HELPERS ---------- */}
      <View className="flex-col gap-0.5">
        {helperText && (
          <Text
            nativeID={helperTextId}
            className="text-xs text-grey-700 mt-0.5"
          >
            {helperText}
          </Text>
        )}

        {errorMessage && (
          <Text
            nativeID={errorTextId}
            className="text-xs text-error-100 font-medium mt-0.5"
          >
            {errorMessage}
          </Text>
        )}
      </View>
    </View>
  );
}
