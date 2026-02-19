import React from "react";
import { View, Text, Pressable } from "react-native";
import { cssInterop } from "nativewind";
import clsx from "clsx";
import { SelectionCardProps } from "./selection-card.types";
import ArrowRightIconSource from "@assets/icons/ic_arrow_right.svg";

const ArrowRightIcon = cssInterop(ArrowRightIconSource, {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
});

export const SelectionCard = ({
  title,
  description,
  icon,
  features,
  actionLabel,
  onPress,
  badgeText,
  className,
  testID,
}: SelectionCardProps) => {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}. ${actionLabel}`}
      accessibilityHint="Navigue vers le formulaire d'inscription correspondant"
      className={clsx(
        // --- BASE ---
        "bg-white border border-grey-200 rounded-3xl p-6 mb-4",
        "shadow-md w-full relative overflow-hidden",
        "hover:border-primary-hover",
        "focus:ring-2 focus:ring-focus focus:ring-offset-2",
        "web:focus:ring-0 web:focus:ring-offset-0",
        "web:outline-none",
        "web:focus-visible:ring-2 web:focus-visible:ring-focus web:focus-visible:ring-offset-2",

        className,
      )}
    >
      {/* --- BADGE (Optionnel) --- */}
      {badgeText && (
        <View className="absolute px-3 py-1 rounded-full top-4 right-4 bg-white-active">
          <Text className="text-xs font-bold text-primary">{badgeText}</Text>
        </View>
      )}

      {/* --- ICONE PRINCIPALE --- */}
      <View className="items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-white-hover">
        {icon}
      </View>

      {/* --- TITRE & DESCRIPTION --- */}
      <Text className="mb-2 text-xl font-bold text-grey-900">{title}</Text>

      <Text className="mb-6 text-sm leading-6 text-grey-600">
        {description}
      </Text>

      {/* --- LISTE A PUCES (Features) --- */}
      <View className="gap-3 mb-8">
        {features.map((feature, index) => (
          <View key={index} className="flex-row items-center">
            {/* Puce orange */}
            <View className="w-2 h-2 mr-3 rounded-full bg-primary" />
            <Text className="flex-1 text-sm text-grey-700">{feature}</Text>
          </View>
        ))}
      </View>

      {/* --- CALL TO ACTION --- */}
      <View className="flex-row items-center mt-auto">
        <Text className="mr-2 text-base font-bold text-primary-default">
          {actionLabel}
        </Text>
        {/* Icône Flèche SVG */}
        <ArrowRightIcon className="w-5 h-5 text-primary-default" />
      </View>
    </Pressable>
  );
};
