import { Pressable, View } from "react-native";
import clsx from "clsx";
import { cssInterop } from "nativewind";
import { Text } from "../text/text";
import { TagBadge } from "../tag-badge/tag-badge";
import { MissionCardProps } from "./mission-card.types";
import { MATCH_THRESHOLD, type MissionFrequency } from "@repo/shared";

import HandHeartIconSource from "@assets/icons/ic_hand_heart.svg";
import CalendarIconSource from "@assets/icons/ic_calendar.svg";
import BoxIconSource from "@assets/icons/ic_box.svg";
import InfoIconSource from "@assets/icons/ic_info.svg";
import LocalisationIconSource from "@assets/icons/ic_localisation.svg";
import ClockIconSource from "@assets/icons/ic_clock.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const HandHeartIcon = cssInterop(HandHeartIconSource, iconConfig);
const CalendarIcon = cssInterop(CalendarIconSource, iconConfig);
const BoxIcon = cssInterop(BoxIconSource, iconConfig);
const InfoIcon = cssInterop(InfoIconSource, iconConfig);
const LocalisationIcon = cssInterop(LocalisationIconSource, iconConfig);
const ClockIcon = cssInterop(ClockIconSource, iconConfig);

const typeConfig = {
  MISSION: {
    label: "Mission",
    badgeVariant: "green" as const,
    bgClass: "bg-green-50",
    iconClass: "text-green-700",
    Icon: HandHeartIcon,
  },
  EVENT: {
    label: "Événement",
    badgeVariant: "blue" as const,
    bgClass: "bg-blue-50",
    iconClass: "text-blue-700",
    Icon: CalendarIcon,
  },
  COLLECT: {
    label: "Collecte",
    badgeVariant: "orange" as const,
    bgClass: "bg-badge-orange-bg",
    iconClass: "text-badge-orange-text",
    Icon: BoxIcon,
  },
  INFO: {
    label: "Info",
    badgeVariant: "surface" as const,
    bgClass: "bg-grey-100",
    iconClass: "text-grey-700",
    Icon: InfoIcon,
  },
};

const frequencyLabels: Record<MissionFrequency, string> = {
  ONCE: "Ponctuel",
  DAILY: "Quotidien",
  WEEKLY: "Hebdomadaire",
  MONTHLY: "Mensuel",
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h${remaining}` : `${hours}h`;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

/**
 * Card de mission pour le listing des activités.
 *
 * La couleur et l'icône s'adaptent automatiquement au type :
 * - MISSION : vert (ic_hand_heart)
 * - EVENT   : bleu (ic_calendar)
 * - COLLECT : orange (ic_box)
 * - INFO    : gris (ic_info)
 */
export function MissionCard({
  title,
  description,
  type,
  associationName,
  city,
  durationInt,
  frequency,
  volunteersNeeded,
  startDate,
  causes,
  volunteerTypes,
  onPress,
  className,
  testID,
  matchScore,
}: MissionCardProps) {
  const { label, badgeVariant, bgClass, iconClass, Icon } = typeConfig[type];

  // Badge contextuel : "Ouvert à tous" = idéal pour débuter
  const isOpenToAll = volunteerTypes.includes("Ouvert à tous");

  // Mise en avant : score connu ET ≥ seuil
  const isHighlighted =
    typeof matchScore === "number" && matchScore >= MATCH_THRESHOLD;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      testID={testID}
      className={clsx(
        // flex-1 : remplit la hauteur du wrapper étiré par la grille (égalise les
        // cards d'une même ligne) ; flex-col pour empiler header + footer.
        "flex-1 flex-col bg-white rounded-2xl overflow-hidden border-2",
        isHighlighted ? "border-amber-400" : "border-grey-200",
        onPress && [
          isHighlighted ? "hover:border-amber-500" : "hover:border-primary",
          "hover:shadow-md",
          "active:bg-grey-50",
          "web:cursor-pointer",
          "web:outline-none",
          "web:focus-visible:ring-2 web:focus-visible:ring-focus web:focus-visible:ring-offset-2",
        ],
        className,
      )}
    >
      {isHighlighted && (
        <View
          testID={testID ? `${testID}-match-badge` : "mission-card-match-badge"}
          className="flex-row items-center gap-1 self-start ml-3 mt-3 px-2 py-0.5 bg-amber-100 rounded-full"
          accessibilityLabel={`Recommandé, score ${matchScore} sur 100`}
        >
          <Text className="text-xs leading-none text-amber-600">★</Text>
          <Text className="text-xs font-semibold text-amber-700">
            Recommandé · {matchScore}%
          </Text>
        </View>
      )}
      {/* Header avec icône de type — flex-1 pour pousser le footer en bas */}
      <View className="flex-1 p-4 pb-0">
        <View className="flex-row items-center gap-3 mb-3">
          <View
            className={clsx(
              "w-10 h-10 rounded-lg items-center justify-center",
              bgClass,
            )}
          >
            <Icon className={clsx("w-5 h-5", iconClass)} />
          </View>
          <View className="flex-1">
            <Text
              className="text-xs font-semibold text-grey-500"
              numberOfLines={1}
            >
              {associationName}
            </Text>
          </View>
        </View>

        {/* Badges */}
        <View className="flex-row flex-wrap gap-1.5 mb-2">
          <TagBadge label={label} variant={badgeVariant} size="sm" />
          {isOpenToAll && (
            <TagBadge label="Ouvert à tous" variant="green" size="sm" />
          )}
        </View>

        {/* Titre */}
        <Text
          className="text-base font-bold text-grey-900 mb-1.5"
          numberOfLines={2}
        >
          {title}
        </Text>

        {/* Description */}
        <Text className="text-sm leading-5 text-grey-600 mb-3" numberOfLines={3}>
          {description}
        </Text>
      </View>

      {/* Footer avec métadonnées */}
      <View className="px-4 py-3 border-t border-grey-100">
        <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
          {/* Localisation */}
          {!!city && (
            <View className="flex-row items-center gap-1">
              <LocalisationIcon className="w-3.5 h-3.5 text-grey-400" />
              <Text className="text-xs text-grey-600">{city}</Text>
            </View>
          )}

          {/* Durée */}
          {!!durationInt && (
            <View className="flex-row items-center gap-1">
              <ClockIcon className="w-3.5 h-3.5 text-grey-400" />
              <Text className="text-xs text-grey-600">
                {formatDuration(durationInt)}
              </Text>
            </View>
          )}

          {/* Fréquence */}
          {frequency && (
            <Text className="text-xs text-grey-600">
              {frequencyLabels[frequency]}
            </Text>
          )}

          {/* Date */}
          {startDate && (
            <Text className="text-xs text-grey-500">
              {formatDate(startDate)}
            </Text>
          )}

          {/* Bénévoles recherchés */}
          {!!volunteersNeeded && (
            <Text className="text-xs font-semibold text-primary">
              {volunteersNeeded} bénévole{volunteersNeeded > 1 ? "s" : ""}
            </Text>
          )}
        </View>

        {/* Causes (max 2 affichées) */}
        {causes.length > 0 && (
          <View className="flex-row flex-wrap gap-1 mt-2">
            {causes.slice(0, 2).map((cause) => (
              <TagBadge key={cause} label={cause} variant="surface" size="sm" />
            ))}
            {causes.length > 2 && (
              <Text className="text-xs text-grey-400 self-center">
                +{causes.length - 2}
              </Text>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}
