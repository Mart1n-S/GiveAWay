import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  Platform,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { cssInterop } from "nativewind";
import { BarChart, PieChart, LineChart } from "react-native-gifted-charts";
import clsx from "clsx";

import type { ParticipationStatsDto, ActivityType } from "@repo/shared";
import { ProfileService } from "@/services/profile.service";
import { Text } from "@/components/ui/text/text";
import { Button } from "@/components/ui/button/button";
import { SearchInput } from "@/components/ui/search-input/SearchInput";
import { colors } from "@/components/ui/theme/tokens";
import { KpiCard } from "@/components/ui/stats/KpiCard";
import { SectionTitle } from "@/components/ui/stats/SectionTitle";
import { TypeFilterBar, TYPE_LABELS, TYPE_COLORS } from "@/components/ui/stats/TypeFilterBar";
import { FilterDateRow } from "@/components/ui/stats/FilterDateRow";
import { usePageTitle } from "@/hooks/usePageTitle";

import ArrowLeftIconSource from "@assets/icons/ic_arrow_left.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const ArrowLeftIcon = cssInterop(ArrowLeftIconSource, iconConfig);

const CHART_WIDTH = Platform.OS === "web" ? 500 : 300;

function PieChartCenter({ total }: { readonly total: number }) {
  return <Text className="text-sm font-bold text-grey-900">{total}</Text>;
}
const MISSIONS_LIMIT = 20;

export default function AssociationsAideesScreen() {
  const router = useRouter();
  usePageTitle("Associations aidées");

  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  const [type, setType] = useState<ActivityType | undefined>(undefined);
  const [stats, setStats] = useState<ParticipationStatsDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [search, setSearch] = useState("");
  const [showAllMissions, setShowAllMissions] = useState(false);

  const hasFilters = !!startDate || !!endDate || !!type;

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const data = await ProfileService.getParticipationStats({ startDate, endDate, type });
      setStats(data);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, type]);

  useEffect(() => {
    load();
  }, [load]);

  const handleResetFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setType(undefined);
  };

  // ─── Chart data ───────────────────────────────────────────────────
  const barData =
    stats?.byAssociation.slice(0, 8).map((a) => ({
      value: a.count,
      label: a.name.length > 7 ? `${a.name.substring(0, 7)}…` : a.name,
      frontColor: colors.primary.default,
    })) ?? [];

  const pieData =
    stats?.byType.map((t) => ({
      value: t.count,
      color: TYPE_COLORS[t.type],
      text: String(t.count),
      focused: false,
    })) ?? [];

  const lineData = stats?.byMonth.map((m) => ({ value: m.count })) ?? [];

  // ─── Tables ───────────────────────────────────────────────────────
  const filteredAssociations = search.trim()
    ? (stats?.byAssociation ?? []).filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase()),
      )
    : (stats?.byAssociation ?? []);

  const allMissions = stats?.participations ?? [];
  const visibleMissions = showAllMissions
    ? allMissions
    : allMissions.slice(0, MISSIONS_LIMIT);

  const totalParticipations = stats?.summary.totalParticipations ?? 0;

  const renderPieCenter = useCallback(
    () => <PieChartCenter total={totalParticipations} />,
    [totalParticipations],
  );

  // ─── Rendu du contenu principal ───────────────────────────────────
  const renderPageContent = () => {
    if (isLoading) {
      return (
        <View className="items-center justify-center py-16">
          <ActivityIndicator size="large" color={colors.primary.default} />
        </View>
      );
    }

    if (hasError) {
      return (
        <View className="items-center justify-center py-16 gap-3">
          <Text className="text-base text-center text-grey-500">
            Impossible de charger les statistiques.
          </Text>
          <Button variant="secondary" onPress={load}>
            Réessayer
          </Button>
        </View>
      );
    }

    if (totalParticipations === 0) {
      if (hasFilters) {
        return (
          <View className="items-center justify-center py-16 gap-3">
            <Text className="text-sm text-center text-grey-500">
              Aucune mission sur cette période.
            </Text>
            <Button variant="secondary" onPress={handleResetFilters}>
              Réinitialiser les filtres
            </Button>
          </View>
        );
      }
      return (
        <View className="items-center justify-center py-16 gap-2">
          <Text className="text-base font-semibold text-grey-700">
            Aucune participation
          </Text>
          <Text className="text-sm text-center text-grey-500">
            Participez à des missions pour voir vos statistiques.
          </Text>
        </View>
      );
    }

    return (
      <>
        {/* ── KPI Cards ── */}
        <View className="gap-3">
          <View className="flex-row gap-3">
            <KpiCard
              label="Missions réalisées"
              value={stats!.summary.totalParticipations}
              color={colors.primary.default}
            />
            <KpiCard
              label="Associations aidées"
              value={stats!.summary.distinctAssociations}
              color={colors.blue[600]}
            />
          </View>
          <View className="flex-row gap-3">
            <KpiCard
              label="Heures bénévoles"
              value={
                stats!.summary.totalHours === null
                  ? "–"
                  : `${stats!.summary.totalHours} h`
              }
              color={colors.green[600]}
            />
            <KpiCard
              label="Type favori"
              value={
                stats!.summary.mostFrequentType
                  ? TYPE_LABELS[stats!.summary.mostFrequentType]
                  : "–"
              }
              color={colors.primary.default}
            />
          </View>
        </View>

        {/* ── Bar chart — par association ── */}
        {barData.length > 0 && (
          <View className="p-4 bg-white border rounded-lg border-grey-100">
            <SectionTitle title="Participations par association" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={barData}
                width={Math.max(CHART_WIDTH, barData.length * 56)}
                height={160}
                barWidth={32}
                spacing={20}
                roundedTop
                xAxisColor={colors.grey[200]}
                yAxisColor={colors.grey[200]}
                yAxisTextStyle={{ color: colors.grey[500], fontSize: 10 }}
                xAxisLabelTextStyle={{ color: colors.grey[500], fontSize: 10 }}
                noOfSections={4}
                isAnimated
              />
            </ScrollView>
          </View>
        )}

        {/* ── Pie chart — répartition par type ── */}
        {pieData.length > 0 && (
          <View className="p-4 bg-white border rounded-lg border-grey-100">
            <SectionTitle title="Répartition par type de mission" />
            <View className="flex-row items-center gap-4 flex-wrap">
              <PieChart
                data={pieData}
                radius={80}
                donut
                innerRadius={50}
                centerLabelComponent={renderPieCenter}
              />
              <View className="gap-2 flex-1">
                {stats!.byType.map((t) => (
                  <View key={t.type} className="flex-row items-center gap-2">
                    <View
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: TYPE_COLORS[t.type] }}
                    />
                    <Text className="text-xs text-grey-700 flex-1">
                      {t.label}
                    </Text>
                    <Text className="text-xs font-semibold text-grey-900">
                      {t.count}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── Line chart — tendance mensuelle ── */}
        {lineData.length >= 2 && (
          <View className="p-4 bg-white border rounded-lg border-grey-100">
            <SectionTitle title="Tendance mensuelle des participations" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <LineChart
                data={lineData}
                width={Math.max(CHART_WIDTH, lineData.length * 48)}
                height={140}
                color={colors.primary.default}
                thickness={2}
                dataPointsColor={colors.primary.default}
                xAxisColor={colors.grey[200]}
                yAxisColor={colors.grey[200]}
                yAxisTextStyle={{ color: colors.grey[500], fontSize: 10 }}
                noOfSections={3}
                curved
                isAnimated
              />
            </ScrollView>
            <View className="flex-row flex-wrap gap-x-3 mt-1">
              {stats!.byMonth.map((m) => (
                <Text key={m.month} className="text-xs text-grey-400">
                  {m.label}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* ── Tableau associations ── */}
        <View className="gap-3">
          <SearchInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher une association..."
          />
          {filteredAssociations.length === 0 ? (
            <View className="items-center py-8">
              <Text className="text-sm text-center text-grey-500">
                Aucune association ne correspond.
              </Text>
            </View>
          ) : (
            <View className="overflow-hidden bg-white border rounded-lg border-grey-100">
              <View className="flex-row items-center px-4 py-2 bg-grey-50 border-b border-grey-100">
                <Text className="flex-1 text-xs font-semibold tracking-wide uppercase text-grey-500">
                  Association
                </Text>
                <Text className="w-28 text-xs font-semibold tracking-wide text-right uppercase text-grey-500">
                  Participations
                </Text>
              </View>
              {filteredAssociations.map((item, idx) => (
                <View
                  key={item.associationId}
                  className={clsx(
                    "flex-row items-center px-4 py-3",
                    idx < filteredAssociations.length - 1 && "border-b border-grey-100",
                  )}
                >
                  <View className="items-center justify-center w-6 h-6 mr-3 rounded-full shrink-0 bg-primary-50">
                    <Text className="text-xs font-bold text-primary">
                      {idx + 1}
                    </Text>
                  </View>
                  <Text
                    className="flex-1 text-sm text-grey-900"
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text className="w-28 text-sm font-bold text-right text-primary">
                    {item.count}×
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Tableau missions détail ── */}
        {allMissions.length > 0 && (
          <View className="gap-2">
            <Text className="text-base font-bold text-grey-900">
              Historique des missions
            </Text>
            <View className="overflow-hidden bg-white border rounded-lg border-grey-100">
              <View className="flex-row items-center px-4 py-2 bg-grey-50 border-b border-grey-100">
                <Text className="flex-1 text-xs font-semibold tracking-wide uppercase text-grey-500">
                  Mission
                </Text>
                <Text className="w-20 text-xs font-semibold tracking-wide text-right uppercase text-grey-500">
                  Type
                </Text>
                <Text className="w-20 text-xs font-semibold tracking-wide text-right uppercase text-grey-500">
                  Date
                </Text>
              </View>
              {visibleMissions.map((p, idx) => {
                const dateStr = p.mission.startDate
                  ? new Date(p.mission.startDate).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "2-digit",
                    })
                  : "–";
                return (
                  <View
                    key={p.missionId}
                    className={clsx(
                      "flex-row items-center px-4 py-3",
                      idx < visibleMissions.length - 1 && "border-b border-grey-100",
                    )}
                  >
                    <Text
                      className="flex-1 text-sm text-grey-900"
                      numberOfLines={1}
                    >
                      {p.mission.title}
                    </Text>
                    <View className="w-20 items-end">
                      <Text
                        className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                        style={{
                          color: TYPE_COLORS[p.mission.type as ActivityType] ?? colors.grey[500],
                          backgroundColor: "transparent",
                        }}
                        numberOfLines={1}
                      >
                        {TYPE_LABELS[p.mission.type as ActivityType] ?? p.mission.type}
                      </Text>
                    </View>
                    <Text className="w-20 text-xs text-right text-grey-500">
                      {dateStr}
                    </Text>
                  </View>
                );
              })}
            </View>
            {allMissions.length > MISSIONS_LIMIT && !showAllMissions && (
              <Pressable
                onPress={() => setShowAllMissions(true)}
                className="items-center py-3 web:cursor-pointer"
              >
                <Text className="text-sm font-semibold text-primary">
                  Voir tout ({allMissions.length} missions)
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: "Associations aidées",
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

          {/* ── Filtres ── */}
          <View className="gap-3 p-4 bg-white border rounded-lg border-grey-100">
            <Text className="text-sm font-bold text-grey-800">Filtres</Text>
            <FilterDateRow
              startDate={startDate}
              endDate={endDate}
              onStartChange={setStartDate}
              onEndChange={setEndDate}
            />
            <TypeFilterBar selected={type} onSelect={setType} />
            {hasFilters && (
              <Pressable
                onPress={handleResetFilters}
                className="self-start web:cursor-pointer"
              >
                <Text className="text-xs font-semibold text-primary">
                  Réinitialiser les filtres
                </Text>
              </Pressable>
            )}
          </View>

          {renderPageContent()}
        </View>
      </ScrollView>
    </>
  );
}
