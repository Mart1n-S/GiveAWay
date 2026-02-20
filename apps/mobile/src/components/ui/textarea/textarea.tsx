import { useState, useRef, useEffect, useId } from "react";
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
import { TextAreaProps } from "./textarea.types";

const isWeb = Platform.OS === "web";

export function TextArea({
  id,
  label,
  helperText,
  errorMessage,
  error = false,
  disabled = false,
  maxLength,
  showCharacterCount = true,
  containerClassName,
  className,
  onFocus,
  onBlur,
  onChangeText,
  value,
  defaultValue,
  ...props
}: TextAreaProps) {
  const [isFocused, setIsFocused] = useState(false);

  // Mobile only : State pour la hauteur dynamique
  const [contentHeight, setContentHeight] = useState(0);

  const [textLength, setTextLength] = useState(
    (value || defaultValue || "").length,
  );

  const inputRef = useRef<TextInput>(null);
  const isError = error || !!errorMessage;

  const uniqueId = useId();
  const inputId = id ?? `textarea-${uniqueId}`;
  const labelId = `${inputId}-label`;
  const helperTextId = `${inputId}-helper`;
  const errorTextId = `${inputId}-error`;
  const charCountId = `${inputId}-count`;

  // CONSTANTE : Hauteur minimale partagée
  const MIN_HEIGHT = 120;

  useEffect(() => {
    if (value !== undefined) {
      setTextLength(value.length);
    }
  }, [value]);

  const handleFocus: NonNullable<TextInputProps["onFocus"]> = (e) => {
    if (disabled) return;
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur: NonNullable<TextInputProps["onBlur"]> = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleChangeText = (text: string) => {
    setTextLength(text.length);
    onChangeText?.(text);
  };

  const handleLabelPress = () => {
    if (!disabled) inputRef.current?.focus();
  };

  // --- LOGIQUE HYBRIDE WEB / MOBILE ---

  // 1. WEB STYLE
  const webStyle = isWeb
    ? ({
        outlineStyle: "none",
        height: "100%",
        minHeight: MIN_HEIGHT - 24, // 24 = padding vertical (py-3 = 12px * 2)
      } as unknown as ViewStyle)
    : {};

  // 2. MOBILE STYLE
  const mobileStyle = !isWeb
    ? { height: Math.max(MIN_HEIGHT, contentHeight) }
    : {};

  return (
    <View className={clsx("flex-col gap-1.5 w-full", containerClassName)}>
      {/* ---------- HEADER ---------- */}
      <View className="flex-row items-end justify-between">
        {label ? (
          <Text
            nativeID={labelId}
            onPress={handleLabelPress}
            className={clsx(
              "text-sm font-semibold",
              isError ? "text-error-100" : "text-grey-800",
              isWeb && !disabled && "cursor-pointer",
              isWeb && disabled && "cursor-not-allowed",
            )}
          >
            {label}
          </Text>
        ) : (
          <View />
        )}

        {maxLength && showCharacterCount && (
          <Text
            nativeID={charCountId}
            className={clsx(
              "text-xs",
              textLength >= maxLength ? "text-error-100" : "text-grey-600",
              disabled && "text-grey-400",
            )}
          >
            {textLength}/{maxLength}
          </Text>
        )}
      </View>

      {/* ---------- INPUT CONTAINER ---------- */}
      <Pressable
        onPress={() => inputRef.current?.focus()}
        // On applique le style minHeight directement ici pour être sûr que le conteneur a la bonne taille
        style={{ minHeight: MIN_HEIGHT }}
        className={clsx(
          // BASE
          "flex-row items-start rounded-md border px-3 py-3 gap-2",

          isWeb && "transition-all",

          // COULEURS
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

          // FOCUS WEB
          isWeb &&
            !disabled &&
            isFocused && [
              "ring-2 ring-focus",
              "ring-offset-2 ring-offset-white",
            ],

          isWeb && disabled && "web:cursor-not-allowed",
          isWeb &&
            !disabled &&
            !isError &&
            !isFocused &&
            "hover:border-primary",
        )}
      >
        <TextInput
          ref={inputRef}
          {...props}
          nativeID={inputId}
          accessibilityLabelledBy={labelId}
          aria-describedby={clsx(
            helperText && helperTextId,
            errorMessage && errorTextId,
          )}
          multiline
          textAlignVertical="top"
          maxLength={maxLength}
          // --- LOGIQUE SCROLL VS AUTO-GROW ---
          scrollEnabled={isWeb}
          onContentSizeChange={
            !isWeb
              ? (e) => {
                  setContentHeight(e.nativeEvent.contentSize.height);
                }
              : undefined
          }
          editable={!disabled}
          readOnly={disabled}
          placeholderTextColor={colors.grey[700]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChangeText={handleChangeText}
          value={value}
          defaultValue={defaultValue}
          // Combinaison des styles
          style={[webStyle, mobileStyle]}
          className={clsx(
            "w-full bg-transparent p-0 border-0 text-base font-sans leading-5",
            isWeb && "outline-none resize-y",
            disabled ? "text-grey-disabledText" : "text-grey-800",
            className,
          )}
        />
      </Pressable>

      {/* ---------- HELPERS / ERREURS ---------- */}
      <View className="flex-col gap-0.5">
        {!!helperText && (
          <Text
            nativeID={helperTextId}
            className="text-xs text-grey-700 mt-0.5"
          >
            {helperText}
          </Text>
        )}

        {!!errorMessage && (
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
