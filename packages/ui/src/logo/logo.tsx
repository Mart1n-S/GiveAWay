import { View } from "react-native";
import clsx from "clsx";
import { Text } from "../text/text";
import { LogoProps, LogoSize } from "./logo.types";

// Configuration des tailles (Container de l'icône + Texte)
const sizeConfig: Record<LogoSize, { iconBox: string; textSize: string }> = {
  sm: { iconBox: "w-6 h-6", textSize: "text-lg" },
  md: { iconBox: "w-8 h-8", textSize: "text-2xl" },
  lg: { iconBox: "w-12 h-12", textSize: "text-4xl" },
  xl: { iconBox: "w-20 h-20", textSize: "text-6xl" },
};

export function Logo({
  size = "md",
  showText = true,
  icon,
  className,
  textColor = "text-grey-900",
  ...props
}: LogoProps) {
  const { iconBox, textSize } = sizeConfig[size];

  return (
    <View
      {...props}
      accessibilityRole="image"
      accessibilityLabel="Logo GiveAWay"
      className={clsx(
        "flex-row items-center gap-3",
        className,
      )}
    >
      {/* Conteneur de l'icône SVG */}
      {/* On force la taille du conteneur, l'icône SVG dedans devra être en width/height 100% */}
      <View className={clsx("items-center justify-center", iconBox)}>
        {icon}
      </View>

      {/* Texte GiveAWay */}
      {showText && (
        <Text
          className={clsx(
            "font-bold font-title tracking-tight",
            textSize,
            textColor,
          )}
        >
          GiveAWay
        </Text>
      )}
    </View>
  );
}
