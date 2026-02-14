import React, { useState } from "react";
import { TouchableOpacity, View, Text } from "react-native";
import clsx from "clsx";
import { TermsModal } from "./terms-modal";
import { TermsCheckboxProps } from "./terms.types";

export const TermsCheckbox = ({
  checked,
  onChange,
  errorMessage,
}: TermsCheckboxProps) => {
  const [modalVisible, setModalVisible] = useState(false);

  // Ouvre la modale au clic (que ce soit pour cocher ou relire)
  const handlePress = () => {
    setModalVisible(true);
  };

  // Clic sur "Je refuse" ou fermeture modale
  const handleRefuse = () => {
    setModalVisible(false);
    onChange(false); // On décoche
  };

  // Clic sur "J'accepte" (après scroll)
  const handleAccept = () => {
    setModalVisible(false);
    onChange(true); // On coche
  };

  // Label pour l'accessibilité
  const accessibilityLabel =
    "Accepter les Conditions Générales d'Utilisation et la Politique de Confidentialité";

  return (
    <>
      {/* 1. L'Affichage (Checkbox + Texte) */}
      <TouchableOpacity
        className={clsx(
          "flex-row items-center mt-4 mb-2",
          "focus:ring-2 focus:ring-focus focus:ring-offset-2",
          "web:focus:ring-0 web:focus:ring-offset-0",
          "web:outline-none",
          "web:focus-visible:ring-2 web:focus-visible:ring-focus web:focus-visible:ring-offset-2 web:rounded",
        )}
        onPress={handlePress}
        // --- Accessibilité ---
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Ouvre les conditions générales pour lecture et acceptation"
      >
        {/* Case à cocher visuelle */}
        <View
          className={clsx(
            "w-6 h-6 rounded border items-center justify-center mr-3 transition-colors",
            checked ? "bg-primary border-primary" : "bg-white border-grey-300",
          )}
        >
          {checked && <Text className="text-xs font-bold text-white">✓</Text>}
        </View>

        {/* Texte */}
        <Text className="flex-1 text-sm text-grey-600">
          J&apos;accepte les{" "}
          <Text className="font-bold text-primary">
            Conditions Générales d&apos;Utilisation
          </Text>{" "}
          et la{" "}
          <Text className="font-bold text-primary">
            Politique de Confidentialité
          </Text>{" "}
          <Text className="text-error-100"> *</Text>.
        </Text>
      </TouchableOpacity>

      {/* 2. Message d'erreur */}
      {errorMessage && (
        <Text className="mb-4 text-xs text-error-100">{errorMessage}</Text>
      )}

      {/* 3. La Modale (pilotée par l'état local) */}
      <TermsModal
        visible={modalVisible}
        onClose={handleRefuse}
        onAccept={handleAccept}
      />
    </>
  );
};
