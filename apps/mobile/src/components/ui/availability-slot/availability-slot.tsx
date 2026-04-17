import { View } from "react-native";
import clsx from "clsx";
import { Text } from "../text/text";
import { AvailabilitySlotProps } from "./availability-slot.types";

/**
 * Carte représentant un créneau de disponibilité.
 *
 * Affiche une icône + un label dans une carte centrée.
 * L'état `active` met en avant le créneau (icône et texte colorés).
 * L'état inactif est grisé pour indiquer une non-disponibilité.
 *
 * @example
 * <AvailabilitySlot
 *   icon={<CalendarIcon />}
 *   label="Semaine"
 *   active
 * />
 */
export function AvailabilitySlot({
  icon,
  label,
  active = false,
  className,
}: AvailabilitySlotProps) {
  return (
    <View
      className={clsx(
        "flex-col items-center justify-center p-3 rounded-lg border",
        "bg-white",
        active ? "border-primary" : "border-grey-700 opacity-40",
        className,
      )}
    >
      <View className={clsx("mb-1", active ? "text-primary" : "text-grey-700")}>
        {icon}
      </View>
      <Text
        className={clsx(
          "text-[10px] font-bold text-center",
          active ? "text-primary" : "text-grey-700",
        )}
      >
        {label}
      </Text>
    </View>
  );
}
