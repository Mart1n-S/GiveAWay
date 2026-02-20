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
      {rules.map((rule, index) => {
        const isValid = rule.valid;

        // Classes du conteneur (Badge)
        const containerClasses = clsx(
          "px-2 py-1 rounded-md border",
          isEmpty
            ? "bg-grey-50 border-grey-200"
            : isValid
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200",
        );

        // Classes du texte
        const textClasses = clsx(
          "text-xs font-medium",
          isEmpty
            ? "text-grey-500"
            : isValid
              ? "text-green-700"
              : "text-red-700",
        );

        // Icône (Puce, Check ou Croix)
        const icon = isEmpty ? "• " : isValid ? "✓ " : "✕ ";

        return (
          <View key={index} className={containerClasses}>
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
