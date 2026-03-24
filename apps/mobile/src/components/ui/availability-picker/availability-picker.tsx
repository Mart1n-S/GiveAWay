import { View, Pressable } from "react-native";
import clsx from "clsx";
import { cssInterop } from "nativewind";
import { Text } from "../text/text";
import { AvailabilitySlot } from "../availability-slot/availability-slot";
import {
  AvailabilityFrequency,
  AvailabilityTime,
  AvailabilityType,
} from "@repo/shared";
import { AvailabilityPickerProps } from "./availability-picker.types";

import BriefcaseIconSource from "@assets/icons/ic_briefcase.svg";
import CalendarIconSource from "@assets/icons/ic_calendar.svg";
import MoonIconSource from "@assets/icons/ic_moon.svg";
import ClockIconSource from "@assets/icons/ic_clock.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const BriefcaseIcon = cssInterop(BriefcaseIconSource, iconConfig);
const CalendarIcon = cssInterop(CalendarIconSource, iconConfig);
const MoonIcon = cssInterop(MoonIconSource, iconConfig);
const ClockIcon = cssInterop(ClockIconSource, iconConfig);

// Labels

const frequencyLabels: Record<AvailabilityFrequency, string> = {
  HOURS_WEEK: "Quelques heures / semaine",
  HOURS_MONTH: "Quelques heures / mois",
  DAYS_WEEK: "Quelques jours / semaine",
  DAYS_MONTH: "Quelques jours / mois",
  ONE_DAY: "Une journée",
  PUNCTUAL: "Ponctuel",
};

const typeLabels: Record<AvailabilityType, string> = {
  REMOTE: "À distance",
  ON_SITE: "Sur site",
  HYBRID: "Hybride",
};

// Pill (multi-select)

function Pill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      className={clsx(
        "px-3 py-2 rounded-lg border transition-all",
        "web:cursor-pointer web:outline-none",
        "web:focus-visible:ring-2 web:focus-visible:ring-focus web:focus-visible:ring-offset-2",
        selected
          ? "bg-white-active border-primary"
          : "bg-white border-grey-200 hover:bg-grey-50 hover:border-grey-300 active:bg-grey-100",
      )}
    >
      <Text
        className={clsx(
          "text-xs font-semibold",
          selected ? "text-primary" : "text-grey-700",
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// Pill (single-select)

function PillRadio({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      className={clsx(
        "px-3 py-2 rounded-lg border transition-all",
        "web:cursor-pointer web:outline-none",
        "web:focus-visible:ring-2 web:focus-visible:ring-focus web:focus-visible:ring-offset-2",
        selected
          ? "bg-white-active border-primary"
          : "bg-white border-grey-200 hover:bg-grey-50 hover:border-grey-300 active:bg-grey-100",
      )}
    >
      <Text
        className={clsx(
          "text-xs font-semibold",
          selected ? "text-primary" : "text-grey-700",
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// Helpers toggle

function toggleItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
}

// Composant principal

/**
 * Sélecteur de disponibilités complet.
 *
 * - Fréquence : multi-sélection (pills)
 * - Créneau horaire : multi-sélection (AvailabilitySlot cliquables)
 * - Type : sélection unique (pills radio)
 *
 * Si tous les créneaux sont sélectionnés → stocké comme ALL_TIME côté backend.
 *
 * @example
 * <AvailabilityPicker
 *   value={availability}
 *   onChange={(val) => setValue("availability", val)}
 * />
 */
export function AvailabilityPicker({
  value,
  onChange,
  className,
}: AvailabilityPickerProps) {
  const frequencies = value.frequency ?? [];
  const timeSlots = value.timeSlots ?? [];
  const type = value.type;

  // Tous les créneaux réels (sans ALL_TIME)
  const realTimeSlots = [
    AvailabilityTime.WEEKDAY,
    AvailabilityTime.WEEKEND,
    AvailabilityTime.EVENING,
  ];

  const isAllTime =
    realTimeSlots.every((slot) => timeSlots.includes(slot)) ||
    timeSlots.includes(AvailabilityTime.ALL_TIME);

  const handleTimeSlotToggle = (slot: AvailabilityTime) => {
    const newSlots = toggleItem(
      timeSlots.filter((s) => s !== AvailabilityTime.ALL_TIME),
      slot,
    );
    onChange({ ...value, timeSlots: newSlots });
  };

  const handleAllTime = () => {
    if (isAllTime) {
      // Déselectionner tout
      onChange({ ...value, timeSlots: [] });
    } else {
      // Sélectionner tous les créneaux
      onChange({ ...value, timeSlots: realTimeSlots });
    }
  };

  return (
    <View className={clsx("gap-6", className)}>
      {/* Fréquence (multi-sélection) */}
      <View className="gap-3">
        <Text className="text-sm font-bold text-grey-800">Fréquence</Text>
        <View className="flex-row flex-wrap gap-2">
          {Object.entries(frequencyLabels).map(([key, label]) => (
            <Pill
              key={key}
              label={label}
              selected={frequencies.includes(key as AvailabilityFrequency)}
              onPress={() =>
                onChange({
                  ...value,
                  frequency: toggleItem(
                    frequencies,
                    key as AvailabilityFrequency,
                  ),
                })
              }
            />
          ))}
        </View>
      </View>

      {/* Créneau horaire (multi-sélection) */}
      <View className="gap-3">
        <Text className="text-sm font-bold text-grey-800">Créneau horaire</Text>
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => handleTimeSlotToggle(AvailabilityTime.WEEKDAY)}
            className="flex-1"
          >
            <AvailabilitySlot
              icon={
                <BriefcaseIcon
                  className={clsx(
                    "w-6 h-6",
                    timeSlots.includes(AvailabilityTime.WEEKDAY)
                      ? "text-primary"
                      : "text-grey-400",
                  )}
                />
              }
              label="Semaine"
              active={timeSlots.includes(AvailabilityTime.WEEKDAY)}
            />
          </Pressable>

          <Pressable
            onPress={() => handleTimeSlotToggle(AvailabilityTime.WEEKEND)}
            className="flex-1"
          >
            <AvailabilitySlot
              icon={
                <CalendarIcon
                  className={clsx(
                    "w-6 h-6",
                    timeSlots.includes(AvailabilityTime.WEEKEND)
                      ? "text-primary"
                      : "text-grey-400",
                  )}
                />
              }
              label="Weekend"
              active={timeSlots.includes(AvailabilityTime.WEEKEND)}
            />
          </Pressable>

          <Pressable
            onPress={() => handleTimeSlotToggle(AvailabilityTime.EVENING)}
            className="flex-1"
          >
            <AvailabilitySlot
              icon={
                <MoonIcon
                  className={clsx(
                    "w-6 h-6",
                    timeSlots.includes(AvailabilityTime.EVENING)
                      ? "text-primary"
                      : "text-grey-400",
                  )}
                />
              }
              label="Soirée"
              active={timeSlots.includes(AvailabilityTime.EVENING)}
            />
          </Pressable>
        </View>

        {/* Bouton "Peu importe" — sélectionne/désélectionne tout */}
        <Pressable
          onPress={handleAllTime}
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          className={clsx(
            "py-2.5 rounded-lg border items-center transition-all",
            "web:cursor-pointer web:outline-none",
            "web:focus-visible:ring-2 web:focus-visible:ring-focus web:focus-visible:ring-offset-2",
            isAllTime
              ? "bg-white-active border-primary"
              : "bg-white border-grey-200 hover:bg-grey-50 hover:border-grey-300 active:bg-grey-100",
          )}
        >
          <View className="flex-row items-center gap-1.5">
            <ClockIcon
              className={clsx(
                "w-4 h-4",
                isAllTime ? "text-primary" : "text-grey-400",
              )}
            />
            <Text
              className={clsx(
                "text-xs font-semibold",
                isAllTime ? "text-primary" : "text-grey-700",
              )}
            >
              Peu importe
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Type (sélection unique) */}
      <View className="gap-3">
        <Text className="text-sm font-bold text-grey-800">Type</Text>
        <View className="flex-row flex-wrap gap-2">
          {Object.entries(typeLabels).map(([key, label]) => (
            <PillRadio
              key={key}
              label={label}
              selected={type === key}
              onPress={() =>
                onChange({ ...value, type: key as AvailabilityType })
              }
            />
          ))}
        </View>
      </View>
    </View>
  );
}
