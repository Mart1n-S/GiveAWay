import React from "react";
import { Platform, Dimensions, View } from "react-native";
import {
  BaseToast,
  BaseToastProps,
  ErrorToast,
  InfoToast,
} from "react-native-toast-message";
import { colors, radius } from "../theme/tokens";
import CloseIconSource from "@assets/icons/ic_close.svg";
import { cssInterop } from "nativewind";

// Note : le monorepo a deux instances de react-native (apps/mobile/node_modules
// en 0.81.5 + node_modules racine en 0.83.1 — attendue par les peerDeps Expo).
// Leur type ViewStyle / TextStyle diverge sur `experimental_backgroundImage`,
// ce qui fait échouer le passage de nos styles à <BaseToast /> (importé de
// react-native-toast-message, qui voit la 0.83.1).
//
// Workaround : on type les constantes locales en `any` au lieu de ViewStyle /
// TextStyle pour neutraliser le conflit de variance. À retirer dès que les
// versions seront alignées (passer apps/mobile/package.json à 0.83.1).

// Configuration de l'icône de fermeture
const CloseIcon = cssInterop(CloseIconSource, {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
});

const { width: windowWidth } = Dimensions.get("window");
const isSmallWeb = Platform.OS === "web" && windowWidth < 768;

/**
 * Style de base pour les Toasts sur le Web (Top-Right)
 * Sur Mobile, on laisse le centrage natif.
 */
const webContainerStyle: any = Platform.select({
  web: {
    position: "fixed",
    right: isSmallWeb ? "2.5%" : 12,
    top: 32,
    left: "auto",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    width: isSmallWeb ? "95%" : 380,
  },
  native: {
    right: 0,
  },
  default: {},
});

/**
 * Style commun des conteneurs
 */
const commonStyle: any = {
  height: "auto",
  minHeight: 64,
  paddingVertical: 10,
  borderRadius: radius.md,
  borderLeftWidth: 8,
  borderWidth: 1,
};

// Fonction pour générer l'icône de fermeture avec la bonne couleur
const renderCloseIcon = (color: string) => (
  <View className="items-center justify-center pr-4">
    <CloseIcon width={14} height={14} color={color} />
  </View>
);

const getTextStyle = (color: string): any => ({
  fontSize: 15,
  fontWeight: "700",
  color: color,
  flexWrap: "wrap",
});

const getSubTextStyle = (color: string): any => ({
  fontSize: 13,
  color: color,
  marginTop: 2,
  opacity: 0.9,
  flexWrap: "wrap",
});

export const toastConfig = {
  /* --- SUCCESS (Green) --- */
  success: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      text1NumberOfLines={2}
      text2NumberOfLines={0}
      renderTrailingIcon={() => renderCloseIcon(colors.green[800])}
      style={[
        commonStyle,
        {
          backgroundColor: colors.green[50],
          borderLeftColor: colors.green[800],
          borderColor: colors.green[100],
        },
        webContainerStyle,
      ]}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      text1Style={getTextStyle(colors.green[800])}
      text2Style={getSubTextStyle(colors.green[800])}
    />
  ),

  /* --- ERROR (Red) --- */
  error: (props: BaseToastProps) => (
    <ErrorToast
      {...props}
      text1NumberOfLines={2}
      text2NumberOfLines={0}
      renderTrailingIcon={() => renderCloseIcon(colors.red[800])}
      style={[
        commonStyle,
        {
          backgroundColor: colors.red[50],
          borderLeftColor: colors.red[800],
          borderColor: colors.red[100],
        },
        webContainerStyle,
      ]}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      text1Style={getTextStyle(colors.red[800])}
      text2Style={getSubTextStyle(colors.red[800])}
    />
  ),

  /* --- INFO (Blue) --- */
  info: (props: BaseToastProps) => (
    <InfoToast
      {...props}
      text1NumberOfLines={2}
      text2NumberOfLines={0}
      renderTrailingIcon={() => renderCloseIcon(colors.blue[800])}
      style={[
        commonStyle,
        {
          backgroundColor: colors.blue[50],
          borderLeftColor: colors.blue[800],
          borderColor: colors.blue[100],
        },
        webContainerStyle,
      ]}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      text1Style={getTextStyle(colors.blue[800])}
      text2Style={getSubTextStyle(colors.blue[800])}
    />
  ),

  /* --- WARNING (Primary/Orange) --- */
  warning: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      text1NumberOfLines={2}
      text2NumberOfLines={0}
      renderTrailingIcon={() => renderCloseIcon(colors.primary.default)}
      style={[
        commonStyle,
        {
          backgroundColor: colors.white.hover,
          borderLeftColor: colors.primary.default,
          borderColor: colors.white.active,
        },
        webContainerStyle,
      ]}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      text1Style={getTextStyle(colors.primary.default)}
      text2Style={getSubTextStyle(colors.primary.default)}
    />
  ),
};
