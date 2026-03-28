import { useWindowDimensions } from "react-native";

export function useMediaQuery() {
  const { width } = useWindowDimensions();

  const isDesktop = width >= 1024;
  const isMobile = width < 1024;

  return {
    isDesktop,
    isMobile,
    width,
  };
}
