import { Text as RNText } from "react-native";
import clsx from "clsx";
import { TextProps } from "./text.types";

export function Text({ className, style, ...props }: TextProps) {
  return (
    <RNText
      {...props}
      style={style}
      className={clsx("font-sans", className)}
    />
  );
}
