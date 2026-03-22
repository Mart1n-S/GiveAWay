import { ReactNode } from "react";

export interface ProfileActionRowProps {
  icon: ReactNode;
  label: string;
  variant?: "default" | "danger";
  onPress: () => void;
  loading?: boolean;
  className?: string;
}
