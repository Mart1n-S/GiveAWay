import { View } from "react-native";
import { Link } from "expo-router";
import clsx from "clsx";
import { Text } from "../text/text";
import { LogoProps, LogoSize } from "./logo.types";

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
    <Link href="/" asChild>
      <View
        {...props}
        accessibilityRole="link"
        accessibilityLabel="Logo GiveAWay — Retour à l'accueil"
        className={clsx(
          "flex-row items-center gap-3 web:cursor-pointer",
          "rounded-md transition-all duration-200",
          "hover:opacity-80 active:opacity-60",
          "web:outline-none focus:outline-none",
          "web:focus-visible:ring-2 web:focus-visible:ring-focus web:focus-visible:ring-offset-2",
          className,
        )}
      >
        <View className={clsx("items-center justify-center", iconBox)}>
          {icon}
        </View>

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
    </Link>
  );
}
