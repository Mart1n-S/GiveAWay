import { useState, useEffect, useCallback } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { Stack, useRouter } from "expo-router";
import { MissionListItem, MissionListQuery } from "@repo/shared";
import { MissionService } from "@/services/mission.service";
import { MissionFilters } from "@/components/ui/mission-filters";
import { MissionCounter } from "@/components/ui/mission-counter/mission-counter";
import { MissionGrid } from "@/components/ui/mission-grid/mission-grid";
import { Text, Button, colors } from "@/components/ui";
import { useReferenceStore } from "@/stores/reference.store";
import { useFilterReferencesStore } from "@/stores/filter-references.store";
import { usePageTitle } from "@/hooks/usePageTitle";

const PAGE_SIZE = 12;
const EMPTY_FILTERS: MissionListQuery = {};

export default function MissionsScreen() {
  const router = useRouter();
  usePageTitle("Missions");
  const [missions, setMissions] = useState<MissionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<MissionListQuery>(EMPTY_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState<string | undefined>();

  // Référentiels pour les chips de filtres
  const { causes, skills, fetchReferences } = useReferenceStore();
  const { publicTypes, volunteerTypes, fetchFilterReferences } = useFilterReferencesStore();

  useEffect(() => {
    fetchReferences();
    fetchFilterReferences();
  }, [fetchReferences, fetchFilterReferences]);

  // Debounce du champ de recherche (400 ms)
  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(filters.search),
      400,
    );
    return () => clearTimeout(timer);
  }, [filters.search]);

  const fetchMissions = useCallback(
    async (pageToLoad: number, append: boolean) => {
      try {
        append ? setIsLoadingMore(true) : setIsLoading(true);
        setError(null);

        const result = await MissionService.getMissions({
          ...filters,
          search: debouncedSearch,
          page: pageToLoad,
          pageSize: PAGE_SIZE,
        });

        setMissions((prev) =>
          append ? [...prev, ...result.missions] : result.missions,
        );
        setTotal(result.total);
        setPage(pageToLoad);
      } catch {
        setError("Impossible de charger les missions. Réessayez.");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [filters, debouncedSearch],
  );

  useEffect(() => {
    fetchMissions(1, false);
  }, [fetchMissions]);

  const hasMore = missions.length < total;

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) fetchMissions(page + 1, true);
  };

  const handleFiltersChange = (newFilters: MissionListQuery) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const handleMissionPress = (id: number) => {
    router.push(`/missions/${id}`);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="w-full px-4 py-6 mx-auto max-w-7xl md:px-8 md:py-8">
          {/* En-tête */}
          <View className="mb-6">
            <Text className="mb-2 text-3xl font-bold text-grey-900">
              Missions
            </Text>
            <Text className="text-base text-grey-600">
              Trouvez des missions de bénévolat près de chez vous
            </Text>
          </View>

          {/* Filtres */}
          <MissionFilters
            value={filters}
            onChange={handleFiltersChange}
            onReset={handleReset}
            variant="list"
            causes={causes}
            skills={skills}
            publicTypes={publicTypes}
            volunteerTypes={volunteerTypes}
            className="mb-6"
          />

          {/* Compteur */}
          <MissionCounter
            total={total}
            isLoading={isLoading}
            className="mb-6"
          />

          {/* Grille ou erreur */}
          {error ? (
            <View className="items-center justify-center py-16">
              <Text className="mb-4 text-base text-red-600">{error}</Text>
              <Button
                variant="secondary"
                onPress={() => fetchMissions(1, false)}
              >
                Réessayer
              </Button>
            </View>
          ) : (
            <MissionGrid
              missions={missions}
              isLoading={isLoading}
              onMissionPress={handleMissionPress}
            />
          )}

          {/* Charger plus */}
          {hasMore && !isLoading && !error && (
            <View className="items-center mt-8">
              <Button
                variant="secondary"
                onPress={handleLoadMore}
                loading={isLoadingMore}
              >
                Voir plus de missions
              </Button>
            </View>
          )}

          {isLoadingMore && (
            <View className="items-center py-4">
              <ActivityIndicator color={colors.primary.default} />
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}
