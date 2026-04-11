import { Marker } from "react-native-maps";
import type { MissionMapItem } from "@repo/shared";

export const TYPE_COLORS: Record<MissionMapItem["type"], string> = {
  MISSION: "#00805b",
  EVENT: "#096e9b",
  COLLECT: "#CC460F",
  INFO: "#5d5f70",
};

interface MissionMarkerNativeProps {
  missions: MissionMapItem[];
  isSelected?: boolean;
  onPress: (group: MissionMapItem[]) => void;
}

/**
 * Marqueur natif simple — aucun Callout.
 * Le popup est géré par Map.native.tsx comme overlay React Native pur,
 * ce qui garantit un rendu correct dans Expo Go et les builds natifs.
 */
export function MissionMarkerNative({
  missions,
  isSelected,
  onPress,
}: MissionMarkerNativeProps) {
  const first = missions[0];
  return (
    <Marker
      coordinate={{ latitude: first.latitude, longitude: first.longitude }}
      pinColor={isSelected ? "#8B2D0A" : TYPE_COLORS[first.type]}
      onPress={() => onPress(missions)}
    />
  );
}
