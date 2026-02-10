import { useWindowDimensions } from "react-native";

export function useMediaQuery() {
  const { width } = useWindowDimensions();

  // Breakpoint standard Tailwind "md" = 768px
  const isDesktop = width >= 768;
  const isMobile = width < 768;

  return {
    isDesktop,
    isMobile,
    width,
  };
}
