import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
  TouchableOpacity,
} from "react-native";
import clsx from "clsx";
import { TermsModalProps } from "./terms.types";
import { TermsCgu } from "./terms-cgu";
import { PrivacyPolicyContent } from "./terms-confidentialite";

export const TermsModal = ({ visible, onClose, onAccept }: TermsModalProps) => {
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);

  // Reset le scroll state quand la modale s'ouvre
  useEffect(() => {
    if (visible) {
      setIsScrolledToBottom(false);
    }
  }, [visible]);

  // Fonction pour détecter la fin du scroll
  const handleScroll = ({
    nativeEvent,
  }: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;

    // Tolérance augmentée pour mobile (évite le besoin de "rebondir" en bas)
    const paddingToBottom = 30;

    // Calcul de la hauteur visible + scroll actuel
    const currentPosition = layoutMeasurement.height + contentOffset.y;

    // Hauteur totale du contenu moins la marge
    const targetPosition = contentSize.height - paddingToBottom;

    // Si le contenu est plus petit que l'écran (pas de scroll nécessaire), on active direct
    if (contentSize.height <= layoutMeasurement.height) {
      if (!isScrolledToBottom) setIsScrolledToBottom(true);
      return;
    }

    // Vérification standard avec tolérance
    if (currentPosition >= targetPosition) {
      if (!isScrolledToBottom) {
        setIsScrolledToBottom(true);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      supportedOrientations={["portrait", "landscape"]}
    >
      <View
        className="items-center justify-center flex-1 p-4 bg-black/50"
        accessibilityViewIsModal={true}
      >
        <View
          className="bg-white w-full max-w-2xl rounded-xl overflow-hidden shadow-xl h-[80%]"
          // @ts-ignore
          accessibilityRole={Platform.OS === "web" ? "dialog" : "alert"}
          aria-modal={true}
        >
          {/* --- HEADER --- */}
          <View
            className="p-4 border-b border-grey-200 bg-grey-50"
            accessibilityRole="header"
          >
            <Text className="text-lg font-bold text-center text-grey-900">
              Conditions Générales d&apos;Utilisation et Politique de
              Confidentialité
            </Text>
          </View>

          {/* --- CONTENU --- */}
          <ScrollView
            className="flex-1 p-4"
            testID="terms-scroll-view"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: 20 }}
            accessibilityLabel="Texte des conditions générales"
            overScrollMode="always"
            bounces={true}
          >
            <TermsCgu />
            <View className="w-full h-px mb-4 bg-primary" />
            <PrivacyPolicyContent />
          </ScrollView>

          {/* --- FOOTER --- */}
          <View className="flex-col gap-3 p-4 border-t border-grey-200 bg-grey-50 md:flex-row">
            {/* BOUTON REFUSER */}
            <TouchableOpacity
              onPress={onClose}
              className={clsx(
                "group relative h-[44px] rounded-md flex-row items-center justify-center transition-all w-full md:flex-1",
                "bg-white/0 border border-transparent",
                "hover:bg-white-hover",
                "active:bg-white-active",
                "web:cursor-pointer",
                "focus:ring-2 focus:ring-focus focus:ring-offset-2",
                "web:focus:ring-0 web:focus:ring-offset-0",
                "web:outline-none",
                "web:focus-visible:ring-2 web:focus-visible:ring-focus web:focus-visible:ring-offset-2",
              )}
              accessibilityLabel="Refuser les conditions et fermer"
              accessibilityRole="button"
            >
              <Text className="font-sans text-base font-bold transition-colors text-primary group-hover:text-primary-hover group-active:text-primary-active">
                Je refuse
              </Text>
            </TouchableOpacity>

            {/* BOUTON ACCEPTER */}
            <TouchableOpacity
              onPress={onAccept}
              testID="btn-accept-terms-modal"
              disabled={!isScrolledToBottom}
              className={clsx(
                "group relative h-[44px] rounded-md flex-row items-center justify-center transition-all w-full md:flex-1",
                "web:cursor-pointer",
                "focus:ring-2 focus:ring-focus focus:ring-offset-2",
                "web:focus:ring-0 web:focus:ring-offset-0",
                "web:outline-none",
                "web:focus-visible:ring-2 web:focus-visible:ring-focus web:focus-visible:ring-offset-2",
                isScrolledToBottom
                  ? [
                      "bg-primary border border-primary",
                      "hover:bg-primary-hover hover:border-primary-hover",
                      "active:bg-primary-active active:border-primary-active",
                      "web:cursor-pointer",
                    ]
                  : [
                      "bg-grey-100 border border-grey-100",
                      "web:cursor-not-allowed",
                    ],
              )}
              accessibilityState={{ disabled: !isScrolledToBottom }}
              accessibilityLabel={
                isScrolledToBottom
                  ? "Accepter les conditions"
                  : "Veuillez lire tout le texte pour accepter"
              }
              accessibilityRole="button"
            >
              <Text
                className={clsx(
                  "font-bold text-base font-sans transition-colors",
                  isScrolledToBottom
                    ? "text-white"
                    : "text-grey-disabledText web:cursor-not-allowed",
                )}
              >
                {isScrolledToBottom ? "J'accepte" : "Lire la suite"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
