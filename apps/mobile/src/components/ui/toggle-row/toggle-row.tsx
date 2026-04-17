import { useRef, useEffect } from "react";
import { View, Pressable, Animated } from "react-native";
import { Text } from "@/components/ui/text/text";
import { colors } from "@/components/ui/theme/tokens";
import type { ToggleRowProps } from "./toggle-row.types";

/**
 * Ligne de paramètre avec un toggle Switch custom.
 * Thumb toujours blanc, track animé entre gris et orange (ou rouge en erreur).
 *
 * @example
 * <ToggleRow
 *   label="Notifications par e-mail"
 *   description="Recevez les mises à jour par e-mail"
 *   value={emailNotifications}
 *   onValueChange={handleEmailToggle}
 *   errorMessage={emailError}
 * />
 */
export function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  errorMessage,
  testID,
}: ToggleRowProps) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      colors.grey[200],
      errorMessage ? colors.red[600] : colors.primary.default,
    ],
  });

  const thumbTranslate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 24],
  });

  return (
    <View className="gap-1 px-5 py-4">
      <View className="flex-row items-center justify-between gap-4">
        <View className="flex-1 gap-0.5">
          <Text
            className={[
              "text-base font-semibold",
              errorMessage ? "text-red-600" : "text-grey-900",
            ].join(" ")}
          >
            {label}
          </Text>
          {!!description && (
            <Text className="text-sm text-grey-500">{description}</Text>
          )}
        </View>

        <Pressable
          testID={testID}
          onPress={() => onValueChange(!value)}
          accessibilityRole="switch"
          accessibilityState={{ checked: value }}
          {...({ "aria-checked": value } as any)}
        >
          <Animated.View
            style={{
              width: 48,
              height: 28,
              borderRadius: 14,
              backgroundColor: trackColor,
              justifyContent: "center",
            }}
          >
            <Animated.View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: "#ffffff",
                transform: [{ translateX: thumbTranslate }],
                shadowColor: "#000",
                shadowOpacity: 0.15,
                shadowRadius: 2,
                shadowOffset: { width: 0, height: 1 },
              }}
            />
          </Animated.View>
        </Pressable>
      </View>

      {!!errorMessage && (
        <Text className="text-xs text-red-600 mt-0.5">{errorMessage}</Text>
      )}
    </View>
  );
}
