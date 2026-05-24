import { useWindowDimensions } from "react-native";

/**
 * Breakpoint au-dessus duquel on bascule en layout "desktop" (nav inline
 * dans la WebNavBar). En-dessous, on passe en burger menu. Réglé à 1280
 * pour que la nav inline ait suffisamment de place pour ses ~6 liens
 * (avec libellés longs comme "Trouver une association") sans tronquer.
 */
const DESKTOP_BREAKPOINT = 1280;

export function useMediaQuery() {
  const { width } = useWindowDimensions();

  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const isMobile = width < DESKTOP_BREAKPOINT;

  return {
    isDesktop,
    isMobile,
    width,
  };
}
