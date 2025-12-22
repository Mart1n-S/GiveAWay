import { Pressable, Text, ActivityIndicator, View } from "react-native";
import clsx from "clsx";
import { colors } from "../theme/tokens";
import { ButtonProps } from "./button.types";

export function Button({
  children,
  variant = "primary",
  disabled = false,
  loading = false,
  className,
  icon,
  ...props
}: ButtonProps) {
  // Est-ce que le bouton doit bloquer les clics ? (Oui si disabled OU loading)
  const isPressableDisabled = disabled || loading;

  // Est-ce que le bouton est interactif visuellement ? (Seulement si ni disabled ni loading)
  const isInteractive = !disabled && !loading;

  return (
    <Pressable
      {...props}
      disabled={isPressableDisabled}
      role="button"
      accessibilityRole="button"
      accessibilityLabel={
        props.accessibilityLabel ??
        (typeof children === "string" ? children : undefined)
      }
      className={clsx(
        // --- BASE ---
        // AJOUT DE "relative" pour positionner le spinner en absolu
        "group relative h-control rounded-md flex-row items-center justify-center transition-all",

        // LOGIQUE DU CARRÉ 44x44
        // Si texte présent : Padding lateral standard (px-5)
        // Si PAS de texte : Largeur fixe 44px + Pas de padding (px-0)
        children ? "px-5" : "w-[44px] px-0",

        // --- CURSEURS ---
        // 1. Interactif : Main
        isInteractive && "web:cursor-pointer",
        // 2. Disabled : Panneau interdit
        disabled && "web:cursor-not-allowed",
        // 3. Loading : Curseur par défaut (flèche), pas de main
        loading && "web:cursor-default",

        // ===============================================
        //  VARIANTS (Couleurs de base + Interactions)
        // ===============================================

        // 1. PRIMARY
        // On applique la couleur de base si ce n'est PAS disabled (donc Loading ou Normal)
        !disabled &&
          variant === "primary" && [
            "bg-primary border border-primary",
            // Interactions UNIQUEMENT si interactif (pas en loading)
            isInteractive &&
              "hover:bg-primary-hover hover:border-primary-hover",
            isInteractive &&
              "active:bg-primary-active active:border-primary-active",
          ],

        // 2. SECONDARY
        !disabled &&
          variant === "secondary" && [
            "bg-white border border-primary",
            isInteractive && "hover:bg-white-hover hover:border-primary-hover",
            isInteractive &&
              "active:bg-white-active active:border-primary-active",
          ],

        // 3. TERTIARY
        !disabled &&
          variant === "tertiary" && [
            "bg-white/0 border border-transparent",
            isInteractive && "hover:bg-white-hover",
            isInteractive && "active:bg-white-active",
          ],

        // --- FOCUS ---
        !isPressableDisabled && [
          "focus:ring-2 focus:ring-focus focus:ring-offset-2",
          "web:focus:ring-0 web:focus:ring-offset-0",
          "web:outline-none",
          "web:focus-visible:ring-2 web:focus-visible:ring-focus web:focus-visible:ring-offset-2",
        ],

        // ===============================================
        //  ÉTAT DISABLED STRICT (Gris)
        // ===============================================
        // S'applique uniquement si la prop disabled est true (pas juste loading)
        disabled && "bg-grey-300 border border-grey-300",

        className
      )}
    >
      {/* 1. LE CONTENU (Texte + Icone)
          On le garde TOUJOURS rendu pour qu'il définisse la largeur du bouton.
          Si loading = true, on le rend juste invisible (opacity-0).
      */}
      <View
        className={clsx(
          "flex-row items-center justify-center gap-2",
          loading && "opacity-0"
        )}
      >
        {icon && <View>{icon}</View>}

        {children ? (
          <Text
            className={clsx(
              "font-bold text-base font-sans transition-colors",
              !disabled && variant === "primary" && "text-white",
              !disabled &&
                (variant === "secondary" || variant === "tertiary") && [
                  "text-primary",
                  isInteractive && "group-hover:text-primary-hover",
                  isInteractive && "group-active:text-primary-active",
                ],
              disabled && "text-grey-disabledText"
            )}
          >
            {children}
          </Text>
        ) : null}
      </View>

      {/* 2. LE SPINNER
          Il vient se superposer (absolute) par-dessus le contenu invisible.
          Il est centré parfaitement au milieu du bouton.
      */}
      {loading && (
        <View className="absolute inset-0 items-center justify-center">
          <ActivityIndicator
            color={
              variant === "primary"
                ? colors.white.default
                : colors.primary.default
            }
          />
        </View>
      )}
    </Pressable>
  );
}
