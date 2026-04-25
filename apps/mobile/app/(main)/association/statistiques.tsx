import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  ActivityIndicator,
  Platform,
  Pressable,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { BarChart, PieChart, LineChart } from "react-native-gifted-charts";
import Toast from "react-native-toast-message";

import { cssInterop } from "nativewind";
import { Text } from "@/components/ui/text/text";
import { Button } from "@/components/ui/button/button";
import { colors } from "@/components/ui/theme/tokens";
import { KpiCard } from "@/components/ui/stats/KpiCard";
import { SectionTitle } from "@/components/ui/stats/SectionTitle";
import { TypeFilterBar, TYPE_LABELS, TYPE_COLORS } from "@/components/ui/stats/TypeFilterBar";
import { FilterDateRow } from "@/components/ui/stats/FilterDateRow";

import ArrowLeftIconSource from "@assets/icons/ic_arrow_left.svg";
import { useAuthStore } from "@/stores/auth.store";
import { AssociationMissionService } from "@/services/association-mission.service";
import type { AssociationMissionStats, ActivityType, StatsQueryDto } from "@repo/shared";
import { usePageTitle } from "@/hooks/usePageTitle";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const ArrowLeftIcon = cssInterop(ArrowLeftIconSource, iconConfig);

const CHART_WIDTH = Platform.OS === "web" ? 500 : 320;

// ─── Composant stable pour le centre du PieChart ─────────────────────────────

function PieChartCenter({ total }: { readonly total: number }) {
  return (
    <Text className="text-sm font-bold text-grey-900">{total}</Text>
  );
}

// ─── Génération HTML pour PDF ─────────────────────────────────────────────────

function buildPdfHtml(stats: AssociationMissionStats, associationName: string, filters: StatsQueryDto): string {
  const dateRange =
    filters.startDate || filters.endDate
      ? `Période : ${filters.startDate ?? "début"} → ${filters.endDate ?? "aujourd'hui"}`
      : "Toutes périodes confondues";

  const typeFilter = filters.missionType
    ? `Type : ${TYPE_LABELS[filters.missionType]}`
    : "";

  const byTypeRows = stats.byType
    .map(
      (t) =>
        `<tr><td>${t.label}</td><td>${t.count}</td><td>${t.participants}</td></tr>`,
    )
    .join("");

  const byMonthRows = stats.byMonth
    .map(
      (m) =>
        `<tr><td>${m.label}</td><td>${m.missions}</td><td>${m.participants}</td></tr>`,
    )
    .join("");

  const topRows = stats.topMissions
    .map(
      (m, i) =>
        `<tr><td>${i + 1}</td><td>${m.title}</td><td>${TYPE_LABELS[m.type]}</td><td>${m.participantsCount}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Statistiques — ${associationName}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #333; }
    h1 { color: #CC460F; font-size: 22px; margin-bottom: 4px; }
    .subtitle { color: #888; font-size: 13px; margin-bottom: 24px; }
    .kpi-grid { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 32px; }
    .kpi-card { border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px 20px; min-width: 140px; text-align: center; }
    .kpi-value { font-size: 28px; font-weight: bold; color: #CC460F; }
    .kpi-label { font-size: 12px; color: #8c93a5; margin-top: 4px; }
    h2 { font-size: 16px; margin-top: 32px; margin-bottom: 8px; border-bottom: 2px solid #CC460F; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f6f7f8; text-align: left; padding: 8px 10px; border-bottom: 2px solid #E5E7EB; }
    td { padding: 8px 10px; border-bottom: 1px solid #E5E7EB; }
    tr:hover td { background: #fdf4f0; }
    .footer { margin-top: 40px; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 12px; }
  </style>
</head>
<body>
  <h1>Statistiques des missions — ${associationName}</h1>
  <p class="subtitle">
    Exporté le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
    &nbsp;·&nbsp; ${dateRange}
    ${typeFilter ? `&nbsp;·&nbsp; ${typeFilter}` : ""}
  </p>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-value">${stats.summary.totalMissions}</div>
      <div class="kpi-label">Total missions</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value">${stats.summary.totalParticipants}</div>
      <div class="kpi-label">Total participants</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value">${stats.summary.activeMissions}</div>
      <div class="kpi-label">Missions actives</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value">${stats.summary.pastMissions}</div>
      <div class="kpi-label">Missions passées</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value">${stats.summary.archivedMissions}</div>
      <div class="kpi-label">Archivées</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value">${stats.summary.averageParticipantsPerMission}</div>
      <div class="kpi-label">Moy. participants / mission</div>
    </div>
  </div>

  <h2>Répartition par type</h2>
  <table>
    <thead><tr><th>Type</th><th>Missions</th><th>Participants</th></tr></thead>
    <tbody>${byTypeRows || "<tr><td colspan='3'>Aucune donnée</td></tr>"}</tbody>
  </table>

  <h2>Activité mensuelle</h2>
  <table>
    <thead><tr><th>Mois</th><th>Missions créées</th><th>Participants</th></tr></thead>
    <tbody>${byMonthRows || "<tr><td colspan='3'>Aucune donnée</td></tr>"}</tbody>
  </table>

  <h2>Top 5 missions (participants)</h2>
  <table>
    <thead><tr><th>#</th><th>Mission</th><th>Type</th><th>Participants</th></tr></thead>
    <tbody>${topRows || "<tr><td colspan='4'>Aucune donnée</td></tr>"}</tbody>
  </table>

  <div class="footer">GiveAWay — Rapport généré automatiquement</div>
</body>
</html>`;
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function StatistiquesScreen() {
  usePageTitle("Statistiques");
  const router = useRouter();

  const user = useAuthStore((state) => state.user);
  const associationId = user?.associations?.[0]?.associationId ?? null;
  const associationName = "Mon association";

  const [stats, setStats] = useState<AssociationMissionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  const [missionType, setMissionType] = useState<ActivityType | undefined>(undefined);

  const currentFilters: StatsQueryDto = {
    startDate,
    endDate,
    missionType,
  };

  const load = useCallback(async () => {
    if (!associationId) return;
    setIsLoading(true);
    try {
      const data = await AssociationMissionService.getStats(associationId, currentFilters);
      setStats(data);
    } catch {
      // Error already shown by the service
    } finally {
      setIsLoading(false);
    }
  }, [associationId, startDate, endDate, missionType]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExportPdf = async () => {
    if (!stats) return;
    setIsExporting(true);
    try {
      const html = buildPdfHtml(stats, associationName, currentFilters);

      if (Platform.OS === "web") {
        const w = window.open("", "_blank");
        if (w) {
          w.document.write(html);
          w.document.close();
          w.print();
        }
        return;
      }

      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Exporter les statistiques",
          UTI: "com.adobe.pdf",
        });
      } else {
        Toast.show({
          type: "info",
          text1: "PDF généré",
          text2: "Le partage n'est pas disponible sur cet appareil.",
          visibilityTime: 5000,
          onPress: () => Toast.hide(),
        });
      }
    } catch {
      Toast.show({
        type: "error",
        text1: "Erreur",
        text2: "Impossible de générer le PDF.",
        visibilityTime: 5000,
        onPress: () => Toast.hide(),
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setMissionType(undefined);
  };

  const hasFilters = !!startDate || !!endDate || !!missionType;

  if (!associationId) {
    return (
      <View className="items-center justify-center flex-1 px-6 bg-grey-50">
        <Text className="text-base text-center text-grey-500">
          Vous n'êtes membre d'aucune association.
        </Text>
      </View>
    );
  }

  // ─── Chart data ───────────────────────────────────────────────────
  const barData =
    stats?.byMonth.map((m) => ({
      value: m.missions,
      label: m.label.split(" ")[0],
      frontColor: colors.primary.default,
    })) ?? [];

  const pieData =
    stats?.byType.map((t) => ({
      value: t.count,
      color: TYPE_COLORS[t.type],
      text: String(t.count),
      focused: false,
    })) ?? [];

  const lineData =
    stats?.participationByMonth.map((m) => ({
      value: m.participants,
    })) ?? [];

  // Stable factory for PieChart center label
  const totalMissions = stats?.summary.totalMissions ?? 0;
  const renderPieCenter = useCallback(
    () => <PieChartCenter total={totalMissions} />,
    [totalMissions],
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

    if (!stats) {
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

    return (
      <>
        {/* ── KPI Cards ── */}
        <View className="gap-3">
          <View className="flex-row gap-3">
            <KpiCard
              label="Total missions"
              value={stats.summary.totalMissions}
              color={colors.primary.default}
            />
            <KpiCard
              label="Total participants"
              value={stats.summary.totalParticipants}
              color={colors.blue[600]}
            />
          </View>
          <View className="flex-row gap-3">
            <KpiCard
              label="Actives"
              value={stats.summary.activeMissions}
              color={colors.green[600]}
            />
            <KpiCard
              label="Passées"
              value={stats.summary.pastMissions}
              color={colors.grey[600]}
            />
          </View>
          <View className="flex-row gap-3">
            <KpiCard
              label="Archivées"
              value={stats.summary.archivedMissions}
              color={colors.grey[500]}
            />
            <KpiCard
              label="Moy. participants"
              value={stats.summary.averageParticipantsPerMission}
              color={colors.primary.default}
            />
          </View>
        </View>

        {/* ── Bar chart — Missions par mois ── */}
        {barData.length > 0 && (
          <View className="p-4 bg-white border rounded-lg border-grey-100">
            <SectionTitle title="Missions créées par mois" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={barData}
                width={Math.max(CHART_WIDTH, barData.length * 48)}
                height={180}
                barWidth={28}
                spacing={16}
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

        {/* ── Pie chart — Répartition par type ── */}
        {pieData.length > 0 && (
          <View className="p-4 bg-white border rounded-lg border-grey-100">
            <SectionTitle title="Répartition par type" />
            <View className="flex-row items-center gap-4 flex-wrap">
              <PieChart
                data={pieData}
                radius={80}
                donut
                innerRadius={50}
                centerLabelComponent={renderPieCenter}
              />
              <View className="gap-2 flex-1">
                {stats.byType.map((t) => (
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

        {/* ── Line chart — Tendance participations ── */}
        {lineData.length > 1 && (
          <View className="p-4 bg-white border rounded-lg border-grey-100">
            <SectionTitle title="Tendance des inscriptions par mois" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <LineChart
                data={lineData}
                width={Math.max(CHART_WIDTH, lineData.length * 48)}
                height={160}
                color={colors.primary.default}
                thickness={2}
                dataPointsColor={colors.primary.default}
                xAxisColor={colors.grey[200]}
                yAxisColor={colors.grey[200]}
                yAxisTextStyle={{ color: colors.grey[500], fontSize: 10 }}
                noOfSections={4}
                curved
                isAnimated
              />
            </ScrollView>
            <View className="flex-row flex-wrap gap-x-3 mt-1">
              {stats.participationByMonth.map((m) => (
                <Text key={m.month} className="text-xs text-grey-400">
                  {m.label.split(" ")[0]}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* ── Top missions ── */}
        {stats.topMissions.length > 0 && (
          <View className="gap-2 p-4 bg-white border rounded-lg border-grey-100">
            <SectionTitle title="Top missions (participants)" />
            {stats.topMissions.map((m, i) => (
              <View
                key={m.id}
                className="flex-row items-center gap-3 py-2 border-b border-grey-100 last:border-0"
              >
                <Text className="text-sm font-bold text-grey-400 w-5 text-center">
                  {i + 1}
                </Text>
                <View
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: TYPE_COLORS[m.type] }}
                />
                <Text
                  className="flex-1 text-sm text-grey-900"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {m.title}
                </Text>
                <Text className="text-sm font-bold text-primary">
                  {m.participantsCount}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Aucune donnée */}
        {stats.summary.totalMissions === 0 && (
          <View className="items-center justify-center py-12 gap-2">
            <Text className="text-base font-semibold text-grey-700">
              Aucune donnée disponible
            </Text>
            <Text className="text-sm text-center text-grey-500">
              Créez des missions pour voir apparaître vos statistiques.
            </Text>
          </View>
        )}
      </>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerTitle: "Statistiques" }} />

      <ScrollView
        className="flex-1 bg-grey-50"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-2xl gap-5 px-4 pt-4 mx-auto">

          {Platform.OS === "web" && (
            <>
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
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold text-grey-900">Statistiques</Text>
                <Button
                  onPress={handleExportPdf}
                  loading={isExporting}
                  disabled={isExporting || !stats}
                  className="px-4 h-9"
                >
                  Exporter PDF
                </Button>
              </View>
            </>
          )}

          {Platform.OS !== "web" && !isLoading && stats && (
            <View className="items-end">
              <Button
                onPress={handleExportPdf}
                loading={isExporting}
                disabled={isExporting}
                className="px-4 h-9"
              >
                Exporter PDF
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
            <TypeFilterBar selected={missionType} onSelect={setMissionType} />
            {hasFilters && (
              <Pressable
                testID="btn-reset-filters"
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
