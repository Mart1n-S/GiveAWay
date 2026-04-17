import React from "react";
import { View, Text } from "react-native";
import clsx from "clsx";

interface PasswordCriteriaProps {
  password?: string;
}

export const PasswordCriteria = ({ password = "" }: PasswordCriteriaProps) => {
  // Définition des règles (identiques à ton Regex Shared)
  const rules = [
    { label: "1 majuscule", valid: /[A-Z]/.test(password) },
    { label: "1 minuscule", valid: /[a-z]/.test(password) },
    { label: "1 chiffre", valid: /[0-9]/.test(password) },
    {
      label: "1 caractère spécial",
      valid: /[^a-zA-Z0-9]/.test(password),
    },
    { label: "12 caractères minimum", valid: password.length >= 12 },
  ];
  const isEmpty = password.length === 0;

  return (
    <View className="flex-row flex-wrap gap-2 mt-2 mb-4">
      {rules.map((rule) => {
        const isValid = rule.valid;

        // Classes du conteneur (Badge)
        let bgClass: string;
        if (isEmpty) {
          bgClass = "bg-grey-50 border-grey-200";
        } else if (isValid) {
          bgClass = "bg-green-50 border-green-200";
        } else {
          bgClass = "bg-red-50 border-red-200";
        }
        const containerClasses = clsx("px-2 py-1 rounded-md border", bgClass);

        // Classes du texte
        let textColorClass: string;
        if (isEmpty) {
          textColorClass = "text-grey-500";
        } else if (isValid) {
          textColorClass = "text-green-700";
        } else {
          textColorClass = "text-red-700";
        }
        const textClasses = clsx("text-xs font-medium", textColorClass);

        // Icône (Puce, Check ou Croix)
        let icon: string;
        if (isEmpty) {
          icon = "• ";
        } else if (isValid) {
          icon = "✓ ";
        } else {
          icon = "✕ ";
        }

        return (
          <View key={rule.label} className={containerClasses}>
            <Text className={textClasses}>
              {icon}
              {rule.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};
