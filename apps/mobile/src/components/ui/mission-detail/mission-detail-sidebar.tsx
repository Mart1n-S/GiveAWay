import { Linking, View } from "react-native";
import { cssInterop } from "nativewind";
import { Text } from "../text/text";
import { Button } from "../button/button";
import { MissionDetailSidebarProps } from "./mission-detail-sidebar.types";

import LocalisationIconSource from "@assets/icons/ic_localisation.svg";
import ClockIconSource from "@assets/icons/ic_clock.svg";
import CalendarIconSource from "@assets/icons/ic_calendar.svg";
import HandHeartIconSource from "@assets/icons/ic_hand_heart.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const LocalisationIcon = cssInterop(LocalisationIconSource, iconConfig);
const ClockIcon = cssInterop(ClockIconSource, iconConfig);
const CalendarIcon = cssInterop(CalendarIconSource, iconConfig);
const HandHeartIcon = cssInterop(HandHeartIconSource, iconConfig);

const FREQUENCY_LABELS: Record<string, string> = {
  ONCE: "Ponctuel",
  DAILY: "Quotidien",
  WEEKLY: "Hebdomadaire",
  MONTHLY: "Mensuel",
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h${remaining}` : `${hours}h`;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function MetaRow({
  icon: Icon,
  children,
}: {
  icon: ReturnType<typeof cssInterop>;
  children: React.ReactNode;
}) {
  return (
    <View className="flex-row items-start gap-2">
      <Icon className="w-4 h-4 text-grey-500 mt-0.5" />
      <View className="flex-1">{children}</View>
    </View>
  );
}

/**
 * Colonne latérale de la fiche mission.
 * Affiche : association, localisation, durée, fréquence, dates, inscrits, CTA.
 */
export function MissionDetailSidebar({
  association,
  city,
  street,
  durationInt,
  frequency,
  startDate,
  endDate,
  participantsCount,
  volunteersNeeded,
  hasRegistration,
}: MissionDetailSidebarProps) {
  return (
    <View className="gap-6">
      {/* Bloc métadonnées */}
      <View className="bg-grey-50 rounded-2xl p-4 gap-3">
        {/* Localisation */}
        {city && (
          <MetaRow icon={LocalisationIcon}>
            <Text className="text-sm text-grey-700">
              {[street, city].filter(Boolean).join(", ")}
            </Text>
          </MetaRow>
        )}

        {/* Durée + fréquence */}
        {durationInt && (
          <MetaRow icon={ClockIcon}>
            <Text className="text-sm text-grey-700">
              {formatDuration(durationInt)}
              {frequency
                ? ` · ${FREQUENCY_LABELS[frequency] ?? frequency}`
                : ""}
            </Text>
          </MetaRow>
        )}

        {/* Dates */}
        {(startDate || endDate) && (
          <MetaRow icon={CalendarIcon}>
            <Text className="text-sm text-grey-700">
              {startDate && endDate
                ? `Du ${formatDate(startDate)} au ${formatDate(endDate)}`
                : startDate
                  ? `À partir du ${formatDate(startDate)}`
                  : `Jusqu'au ${formatDate(endDate!)}`}
            </Text>
          </MetaRow>
        )}

        {/* Inscrits / places */}
        {volunteersNeeded && (
          <MetaRow icon={HandHeartIcon}>
            <Text className="text-sm text-grey-700">
              <Text className="font-semibold text-primary">
                {participantsCount}
              </Text>
              {" / "}
              <Text className="font-semibold">{volunteersNeeded}</Text>{" "}
              bénévole{volunteersNeeded > 1 ? "s" : ""} inscrit
              {participantsCount > 1 ? "s" : ""}
            </Text>
          </MetaRow>
        )}
      </View>

      {/* Bouton inscription */}
      {hasRegistration && (
        <Button variant="primary" onPress={() => {}}>
          Je m'inscris comme bénévole
        </Button>
      )}

      {/* Bloc association */}
      {(association.description || association.website) && (
        <View className="border border-grey-200 rounded-2xl p-4 gap-3">
          <Text className="text-base font-bold text-grey-900">
            {association.name}
          </Text>

          {association.description && (
            <Text className="text-sm leading-6 text-grey-700">
              {association.description}
            </Text>
          )}

          {association.website && (
            <Button
              variant="secondary"
              onPress={() => Linking.openURL(association.website!)}
            >
              Visiter le site web
            </Button>
          )}
        </View>
      )}
    </View>
  );
}
