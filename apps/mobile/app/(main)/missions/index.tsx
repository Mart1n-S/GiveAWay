import { useState, useEffect, useCallback } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ActivityType, MissionListItem } from "@repo/shared";
import { MissionService } from "@/services/mission.service";
import { MissionFilters } from "@/components/ui/mission-filters/mission-filters";
import { MissionCounter } from "@/components/ui/mission-counter/mission-counter";
import { MissionGrid } from "@/components/ui/mission-grid/mission-grid";
import { Text, Button, colors } from "@/components/ui";

const PAGE_SIZE = 12;

export default function MissionsScreen() {
  const router = useRouter();

  // --- État ---
  const [missions, setMissions] = useState<MissionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Filtres ---
  const [selectedType, setSelectedType] = useState<ActivityType | null>(null);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // --- Debounce de la recherche ---
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  // --- Chargement des missions ---
  const fetchMissions = useCallback(
    async (pageToLoad: number, append: boolean) => {
      try {
        append ? setIsLoadingMore(true) : setIsLoading(true);
        setError(null);

        const result = await MissionService.getMissions({
          page: pageToLoad,
          pageSize: PAGE_SIZE,
          type: selectedType ?? undefined,
          search: debouncedSearch || undefined,
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
    [selectedType, debouncedSearch],
  );

  useEffect(() => {
    fetchMissions(1, false);
  }, [fetchMissions]);

  // --- Pagination ---
  const hasMore = missions.length < total;

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) fetchMissions(page + 1, true);
  };

  const handleTypeChange = (type: ActivityType | null) => {
    setSelectedType(type);
    setPage(1);
  };

  const handleMissionPress = (id: number) => {
    router.push(`/missions/${id}`);
  };

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <View className="w-full max-w-7xl mx-auto px-4 py-6 md:px-8 md:py-8">
        {/* En-tête */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-grey-900 mb-2">
            Missions
          </Text>
          <Text className="text-base text-grey-600">
            Trouvez des missions de bénévolat près de chez vous
          </Text>
        </View>

        {/* Filtres */}
        <MissionFilters
          selectedType={selectedType}
          onTypeChange={handleTypeChange}
          searchText={searchText}
          onSearchChange={setSearchText}
          className="mb-6"
        />

        {/* Compteur */}
        <MissionCounter total={total} isLoading={isLoading} className="mb-6" />

        {/* Grille ou erreur */}
        {error ? (
          <View className="items-center justify-center py-16">
            <Text className="text-base text-red-600 mb-4">{error}</Text>
            <Button variant="secondary" onPress={() => fetchMissions(1, false)}>
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
  );
}
