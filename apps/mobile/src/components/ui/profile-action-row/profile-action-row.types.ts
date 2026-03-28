import { ReactNode } from "react";
import { PressableProps } from "react-native";

export interface ProfileActionRowProps extends PressableProps {
  icon: ReactNode;
  label: string;
  variant?: "default" | "danger";
  onPress: () => void;
  loading?: boolean;
  className?: string;
}
