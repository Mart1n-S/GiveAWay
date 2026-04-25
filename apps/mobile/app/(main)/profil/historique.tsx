import React, { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  Platform,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import { Calendar, LocaleConfig } from "react-native-calendars";
import type { DateData } from "react-native-calendars";
import { cssInterop } from "nativewind";

import type { MissionParticipation, ActivityType } from "@repo/shared";
import { ProfileService } from "@/services/profile.service";
import { Text } from "@/components/ui/text/text";
import { Button } from "@/components/ui/button/button";
import { MissionHistoryItem } from "@/components/ui/mission-history-item/mission-history-item";
import { TypeFilterBar } from "@/components/ui/stats/TypeFilterBar";
import { colors } from "@/components/ui/theme/tokens";
import { usePageTitle } from "@/hooks/usePageTitle";

import ArrowLeftIconSource from "@assets/icons/ic_arrow_left.svg";
import CalendarIconSource from "@assets/icons/ic_calendar.svg";
import GestionIconSource from "@assets/icons/ic_gestion.svg";

// ─── Locale calendrier ────────────────────────────────────────────────────────

LocaleConfig.locales["fr"] = {
  monthNames: [
    "Janvier","Février","Mars","Avril","Mai","Juin",
    "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
  ],
  monthNamesShort: [
    "Janv.","Févr.","Mars","Avr.","Mai","Juin",
    "Juil.","Août","Sept.","Oct.","Nov.","Déc.",
  ],
  dayNames: ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"],
  dayNamesShort: ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"],
  today: "Aujourd'hui",
};
LocaleConfig.defaultLocale = "fr";

// ─── Icônes ───────────────────────────────────────────────────────────────────

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const ArrowLeftIcon = cssInterop(ArrowLeftIconSource, iconConfig);
const CalendarIcon = cssInterop(CalendarIconSource, iconConfig);
const GestionIcon = cssInterop(GestionIconSource, iconConfig);

// ─── Types & constantes ───────────────────────────────────────────────────────

type Status = "ongoing" | "upcoming" | "done";

const STATUS_CONFIG: Record<
  Status,
  { label: string; color: string; dotColor: string; bgColor: string }
> = {
  ongoing:  { label: "En cours",  color: colors.green[600],      dotColor: colors.green[500],       bgColor: colors.green[50] },
  upcoming: { label: "À venir",   color: colors.primary.default, dotColor: colors.primary.default,  bgColor: "#FBE8E1" },
  done:     { label: "Terminées", color: colors.grey[500],       dotColor: colors.grey[400],        bgColor: colors.grey[100] },
};

const SECTION_ORDER: Status[] = ["ongoing", "upcoming", "done"];

// Intervalle en jours selon la fréquence
const FREQUENCY_INTERVAL_DAYS: Record<string, number> = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 30,
};

type Classified = MissionParticipation & { status: Status };

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function getStatus(p: MissionParticipation): Status {
  if (!p.mission.startDate) return "done";
  const now = Date.now();
  const start = new Date(p.mission.startDate).getTime();

  if (start > now) return "upcoming";

  const { frequency, endDate } = p.mission;

  // Missions récurrentes : ongoing jusqu'à la date de fin (ou indéfiniment)
  if (frequency && frequency !== "ONCE") {
    if (!endDate) return "ongoing";
    return new Date(endDate).getTime() >= now ? "ongoing" : "done";
  }

  // Mission ponctuelle : compare avec la durée
  if (p.mission.durationInt != null) {
    const endMs = start + p.mission.durationInt * 60 * 1000;
    if (endMs >= now) return "ongoing";
  }
  return "done";
}

function toDateKey(date: Date | string): string {
  const d = new Date(date);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * Génère toutes les dates d'occurrence d'une mission récurrente.
 * Limite à 6 mois dans le futur.
 */
function getOccurrenceDates(
  startDate: Date | string,
  frequency: string | null | undefined,
  endDate: Date | string | null | undefined,
): string[] {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  // Borne maximale : 6 mois dans le futur
  const maxFuture = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
  const upperBound = end && end < maxFuture ? end : maxFuture;

  const dates: string[] = [toDateKey(start)];

  if (!frequency || frequency === "ONCE") return dates;

  const intervalDays = FREQUENCY_INTERVAL_DAYS[frequency] ?? 7;
  const current = new Date(start);

  for (let i = 0; i < 500; i++) {
    if (frequency === "MONTHLY") {
      current.setMonth(current.getMonth() + 1);
    } else {
      current.setDate(current.getDate() + intervalDays);
    }
    if (current > upperBound) break;
    dates.push(toDateKey(new Date(current)));
  }

  return dates;
}

function buildMarkedDates(
  classified: Classified[],
  selected: string | null,
): Record<string, any> {
  const result: Record<
    string,
    { dots: { key: string; color: string }[]; selected?: boolean; selectedColor?: string }
  > = {};

  for (const p of classified) {
    if (!p.mission.startDate) continue;
    const dates = getOccurrenceDates(
      p.mission.startDate,
      p.mission.frequency,
      p.mission.endDate,
    );
    for (const key of dates) {
      if (!result[key]) result[key] = { dots: [] };
      if (!result[key].dots.some((d) => d.key === p.status)) {
        result[key].dots.push({
          key: p.status,
          color: STATUS_CONFIG[p.status].dotColor,
        });
      }
    }
  }

  if (selected) {
    if (!result[selected]) result[selected] = { dots: [] };
    result[selected].selected = true;
    result[selected].selectedColor = colors.primary.default;
  }

  return result;
}

function sortMissions(list: Classified[], order: "asc" | "desc"): Classified[] {
  return [...list].sort((a, b) => {
    const ta = a.mission.startDate ? new Date(a.mission.startDate).getTime() : 0;
    const tb = b.mission.startDate ? new Date(b.mission.startDate).getTime() : 0;
    return order === "asc" ? ta - tb : tb - ta;
  });
}

/** Vérifie si une mission a une occurrence sur la date sélectionnée */
function hasOccurrenceOn(p: Classified, dateKey: string): boolean {
  if (!p.mission.startDate) return false;
  return getOccurrenceDates(
    p.mission.startDate,
    p.mission.frequency,
    p.mission.endDate,
  ).includes(dateKey);
}

// ─── Composant section ────────────────────────────────────────────────────────

function MissionSection({
  status,
  missions,
  onPress,
}: {
  readonly status: Status;
  readonly missions: readonly Classified[];
  readonly onPress: (id: number) => void;
}) {
  const { label, color, bgColor } = STATUS_CONFIG[status];
  if (missions.length === 0) return null;

  return (
    <View className="gap-2">
      <View
        className="flex-row items-center gap-2 px-3 py-1.5 rounded-full self-start"
        style={{ backgroundColor: bgColor }}
      >
        <View className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <Text className="text-xs font-bold" style={{ color }}>
          {label}
        </Text>
        <Text className="text-xs font-normal" style={{ color }}>
          · {missions.length}
        </Text>
      </View>
      <View className="gap-2">
        {missions.map((p) => (
          <MissionHistoryItem
            key={p.missionId}
            title={p.mission.title}
            associationName={p.mission.association.name}
            date={p.mission.startDate ?? p.createdAt}
            type={p.mission.type as "MISSION" | "EVENT" | "COLLECT" | "INFO"}
            onPress={() => onPress(p.missionId)}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Légende du calendrier ────────────────────────────────────────────────────

function CalendarLegend() {
  return (
    <View className="p-3 bg-white border border-grey-100 rounded-lg">
      <Text className="text-xs font-semibold text-grey-500 mb-2 uppercase tracking-wide">
        Légende
      </Text>
      <View className="flex-row flex-wrap gap-x-4 gap-y-2">
        {(Object.entries(STATUS_CONFIG) as [Status, (typeof STATUS_CONFIG)[Status]][]).map(
          ([s, { label, color, dotColor, bgColor }]) => (
            <View key={s} className="flex-row items-center gap-2">
              <View
                className="w-3.5 h-3.5 rounded-full border-2"
                style={{ backgroundColor: dotColor, borderColor: color }}
              />
              <Text className="text-xs font-medium" style={{ color }}>
                {label}
              </Text>
            </View>
          ),
        )}
        <View className="flex-row items-center gap-2">
          <View
            className="w-3.5 h-3.5 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.primary.default }}
          >
            <View className="w-1.5 h-1.5 rounded-full bg-white" />
          </View>
          <Text className="text-xs font-medium" style={{ color: colors.grey[500] }}>
            Jour sélectionné
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function HistoriqueScreen() {
  const router = useRouter();
  usePageTitle("Mes missions");

  const [participations, setParticipations] = useState<MissionParticipation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [typeFilter, setTypeFilter] = useState<ActivityType | undefined>();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const data = await ProfileService.getParticipationStats({});
      setParticipations(data.participations);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(load);

  // ─── Données dérivées ────────────────────────────────────────────────────
  const classified: Classified[] = participations.map((p) => ({
    ...p,
    status: getStatus(p),
  }));

  const filtered = typeFilter
    ? classified.filter((p) => p.mission.type === typeFilter)
    : classified;

  const grouped: Record<Status, Classified[]> = {
    ongoing:  sortMissions(filtered.filter((p) => p.status === "ongoing"),  "desc"),
    upcoming: sortMissions(filtered.filter((p) => p.status === "upcoming"), "asc"),
    done:     sortMissions(filtered.filter((p) => p.status === "done"),     "desc"),
  };

  const markedDates = buildMarkedDates(classified, selectedDate);

  const selectedMissions = selectedDate
    ? classified.filter((p) => hasOccurrenceOn(p, selectedDate))
    : [];

  const today = toDateKey(new Date());

  const handleDayPress = (day: DateData) => {
    setSelectedDate((prev) => prev === day.dateString ? null : day.dateString);
  };

  const handleMissionPress = (id: number) =>
    router.push(`/missions/${id}` as any);

  const hasAnyMissions = classified.length > 0;

  // ─── Rendu du contenu principal ──────────────────────────────────────────
  const renderContent = () => {
    if (isLoading) {
      return (
        <View className="items-center justify-center py-20">
          <ActivityIndicator size="large" color={colors.primary.default} />
        </View>
      );
    }

    if (hasError) {
      return (
        <View className="items-center justify-center py-16 gap-3">
          <Text className="text-base text-center text-grey-500">
            Impossible de charger vos missions.
          </Text>
          <Button variant="secondary" onPress={load}>
            Réessayer
          </Button>
        </View>
      );
    }

    if (hasAnyMissions) {
      return (
        <>
          {/* ══════ VUE LISTE ══════ */}
          {viewMode === "list" && (
            <>
              <View className="p-3 bg-white border rounded-lg border-grey-100">
                <TypeFilterBar selected={typeFilter} onSelect={setTypeFilter} />
              </View>

              {filtered.length === 0 ? (
                <View className="items-center py-12 gap-2">
                  <Text className="text-sm text-grey-500">
                    Aucune mission pour ce type.
                  </Text>
                  <Pressable
                    onPress={() => setTypeFilter(undefined)}
                    className="web:cursor-pointer"
                  >
                    <Text className="text-xs font-semibold text-primary">
                      Voir tout
                    </Text>
                  </Pressable>
                </View>
              ) : (
                SECTION_ORDER.map((status) => (
                  <MissionSection
                    key={status}
                    status={status}
                    missions={grouped[status]}
                    onPress={handleMissionPress}
                  />
                ))
              )}
            </>
          )}

          {/* ══════ VUE PLANNING ══════ */}
          {viewMode === "calendar" && (
            <>
              <View className="overflow-hidden bg-white border rounded-lg border-grey-100">
                <Calendar
                  current={today}
                  onDayPress={handleDayPress}
                  markedDates={markedDates}
                  markingType="multi-dot"
                  enableSwipeMonths
                  theme={{
                    backgroundColor: "transparent",
                    calendarBackground: "transparent",
                    textSectionTitleColor: colors.grey[500],
                    selectedDayBackgroundColor: colors.primary.default,
                    selectedDayTextColor: "#ffffff",
                    todayTextColor: colors.primary.default,
                    todayBackgroundColor: colors.white.hover,
                    dayTextColor: colors.grey[900],
                    textDisabledColor: colors.grey[300],
                    dotColor: colors.primary.default,
                    selectedDotColor: "#ffffff",
                    arrowColor: colors.primary.default,
                    disabledArrowColor: colors.grey[300],
                    monthTextColor: colors.grey[900],
                    textDayFontSize: 14,
                    textMonthFontSize: 15,
                    textMonthFontWeight: "700",
                    textDayHeaderFontSize: 12,
                    textDayHeaderFontWeight: "600",
                    // Dots plus visibles
                    dotStyle: { width: 8, height: 8, borderRadius: 4, marginTop: 2 },
                  }}
                />
              </View>

              <CalendarLegend />

              {selectedDate ? (
                <View className="gap-3">
                  <Text className="text-sm font-bold text-grey-900">
                    {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                      "fr-FR",
                      { weekday: "long", day: "numeric", month: "long", year: "numeric" },
                    )}
                  </Text>
                  {selectedMissions.length === 0 ? (
                    <View className="items-center py-8 bg-white border border-grey-100 rounded-lg">
                      <Text className="text-sm text-grey-500">
                        Aucune mission ce jour.
                      </Text>
                    </View>
                  ) : (
                    <View className="gap-2">
                      {selectedMissions.map((p) => (
                        <MissionHistoryItem
                          key={`${p.missionId}-${selectedDate}`}
                          title={p.mission.title}
                          associationName={p.mission.association.name}
                          date={p.mission.startDate ?? p.createdAt}
                          type={p.mission.type as "MISSION" | "EVENT" | "COLLECT" | "INFO"}
                          onPress={() => handleMissionPress(p.missionId)}
                        />
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <View className="items-center py-8">
                  <Text className="text-sm text-grey-500">
                    Sélectionnez un jour pour voir vos missions.
                  </Text>
                </View>
              )}
            </>
          )}
        </>
      );
    }

    return (
      <View className="items-center justify-center gap-2 px-4 py-16 bg-white border rounded-lg border-grey-100">
        <Text className="text-base font-semibold text-grey-700">
          Aucune mission
        </Text>
        <Text className="text-sm text-center text-grey-500">
          Participez à des missions pour les voir apparaître ici.
        </Text>
      </View>
    );
  };

  // ─── Rendu ───────────────────────────────────────────────────────────────
  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: "Mes missions",
          headerShown: Platform.OS !== "web",
        }}
      />

      <ScrollView
        className="flex-1 bg-grey-50"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-2xl gap-5 px-4 pt-4 mx-auto">
          {Platform.OS === "web" && (
            <View className="items-start">
              <Button
                variant="secondary"
                onPress={() => router.back()}
                icon={
                  <ArrowLeftIcon className="w-4 h-4 text-primary group-hover:text-primary-hover group-active:text-primary-active" />
                }
              >
                Retour
              </Button>
            </View>
          )}

          {/* Toggle Liste / Planning avec icônes SVG */}
          <View className="flex-row gap-1 p-1 bg-white border rounded-lg border-grey-100">
            {(["list", "calendar"] as const).map((mode) => {
              const isActive = viewMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => setViewMode(mode)}
                  className={`flex-1 flex-row items-center justify-center gap-2 py-2 rounded-md web:cursor-pointer web:outline-none web:focus-visible:ring-2 web:focus-visible:ring-focus ${
                    isActive ? "bg-primary" : "active:bg-grey-50"
                  }`}
                >
                  {mode === "list" ? (
                    <GestionIcon
                      className="w-4 h-4"
                      style={{ color: isActive ? "white" : colors.grey[600] }}
                    />
                  ) : (
                    <CalendarIcon
                      className="w-4 h-4"
                      style={{ color: isActive ? "white" : colors.grey[600] }}
                    />
                  )}
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: isActive ? "white" : colors.grey[600] }}
                  >
                    {mode === "list" ? "Liste" : "Planning"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {renderContent()}
        </View>
      </ScrollView>
    </>
  );
}
