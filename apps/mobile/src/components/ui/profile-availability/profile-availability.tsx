import { View } from "react-native";
import clsx from "clsx";
import { cssInterop } from "nativewind";
import { Text } from "../text/text";
import { AvailabilitySlot } from "../availability-slot/availability-slot";
import { AvailabilityTypeDot } from "../availability-type-dot/availability-type-dot";
import { ProfileAvailabilityProps } from "./profile-availability.types";
import {
  AvailabilityFrequency,
  AvailabilityTime,
  AvailabilityType,
} from "@repo/shared";

import BriefcaseIconSource from "@assets/icons/ic_briefcase.svg";
import CalendarIconSource from "@assets/icons/ic_calendar.svg";
import MoonIconSource from "@assets/icons/ic_moon.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const BriefcaseIcon = cssInterop(BriefcaseIconSource, iconConfig);
const CalendarIcon = cssInterop(CalendarIconSource, iconConfig);
const MoonIcon = cssInterop(MoonIconSource, iconConfig);

// Helpers

const frequencyLabels: Record<AvailabilityFrequency, string> = {
  HOURS_WEEK: "Quelques heures / semaine",
  HOURS_MONTH: "Quelques heures / mois",
  DAYS_WEEK: "Quelques jours / semaine",
  DAYS_MONTH: "Quelques jours / mois",
  ONE_DAY: "Une journée",
  PUNCTUAL: "Ponctuel",
};

/**
 * Retourne true si le créneau doit être affiché comme actif.
 * ALL_TIME = tous les créneaux sont actifs.
 */
const isSlotActive = (
  timeSlot: string,
  slotValue: "WEEKDAY" | "WEEKEND" | "EVENING",
): boolean => {
  if (timeSlot === AvailabilityTime.ALL_TIME) return true;
  return timeSlot === slotValue;
};

/**
 * Section disponibilités & préférences du profil bénévole.
 *
 * Affiche :
 * - La fréquence de disponibilité (ex: "Quelques heures / semaine")
 * - Les créneaux horaires (Semaine / Weekend / Soirée)
 * - Le type de disponibilité (Sur site / À distance / Hybride)
 *
 * Si l'utilisateur n'a pas encore renseigné ses disponibilités,
 * un message d'invitation est affiché.
 *
 * @example
 * <ProfileAvailability availability={user.availability} />
 */
export function ProfileAvailability({
  availability,
  className,
}: ProfileAvailabilityProps) {
  if (!availability) {
    return (
      <View
        className={clsx(
          "p-5 rounded-lg bg-white border border-grey-100",
          className,
        )}
      >
        <Text className="mb-1 text-sm font-bold text-grey-900">
          Disponibilités & Préférences
        </Text>
        <Text className="text-sm text-grey-600">
          Aucune disponibilité renseignée.
        </Text>
      </View>
    );
  }

  const isWeekdayActive = isSlotActive(availability.timeSlot, "WEEKDAY");
  const isWeekendActive = isSlotActive(availability.timeSlot, "WEEKEND");
  const isEveningActive = isSlotActive(availability.timeSlot, "EVENING");

  return (
    <View
      className={clsx(
        "p-5 rounded-lg bg-white border border-grey-100 gap-5",
        className,
      )}
    >
      <Text className="text-base font-bold text-grey-900">
        Disponibilités & Préférences
      </Text>

      {/* Fréquence */}
      <View className="flex-row flex-wrap gap-2">
        <View className="px-4 py-2 border rounded-full bg-white-active border-primary">
          <Text className="text-xs font-semibold text-primary">
            {frequencyLabels[availability.frequency as AvailabilityFrequency]}
          </Text>
        </View>
      </View>

      {/* Créneaux horaires */}
      <View className="flex-row gap-3">
        <AvailabilitySlot
          icon={
            <BriefcaseIcon
              className={clsx(
                "w-6 h-6",
                isWeekdayActive ? "text-primary" : "text-grey-600",
              )}
            />
          }
          label="Semaine"
          active={isWeekdayActive}
          className="flex-1"
        />
        <AvailabilitySlot
          icon={
            <CalendarIcon
              className={clsx(
                "w-6 h-6",
                isWeekendActive ? "text-primary" : "text-grey-600",
              )}
            />
          }
          label="Weekend"
          active={isWeekendActive}
          className="flex-1"
        />
        <AvailabilitySlot
          icon={
            <MoonIcon
              className={clsx(
                "w-6 h-6",
                isEveningActive ? "text-primary" : "text-grey-600",
              )}
            />
          }
          label="Soirée"
          active={isEveningActive}
          className="flex-1"
        />
      </View>

      {/* Type de disponibilité */}
      <AvailabilityTypeDot type={availability.type as AvailabilityType} />
    </View>
  );
}
