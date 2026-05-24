import { useState, useEffect, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  View,
  ScrollView,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { cssInterop } from "nativewind";
import clsx from "clsx";

import type { AssociationPublicItem } from "@repo/shared";
import { getPublicAssociations } from "@/services/association.service";
import { AssociationGrid } from "@/components/ui/association-grid/association-grid";
import { SearchInput } from "@/components/ui/search-input/SearchInput";
import { Input } from "@/components/ui/input/input";
import { Text, Button, colors } from "@/components/ui";
import { usePageTitle } from "@/hooks/usePageTitle";

import LocalisationIconSource from "@assets/icons/ic_localisation.svg";

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const LocalisationIcon = cssInterop(LocalisationIconSource, iconConfig);

const PAGE_SIZE = 12;
const isWeb = Platform.OS === "web";

// ─── Géolocalisation helpers ──────────────────────────────────────────────────

async function reverseGeocodeCity(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/reverse/?lon=${lon}&lat=${lat}&limit=1`,
    );
    const json = await res.json();
    const props = json?.features?.[0]?.properties;
    return props?.city ?? props?.municipality ?? null;
  } catch {
    return null;
  }
}

async function geocodeAddress(
  query: string,
): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=1`,
    );
    const json = await res.json();
    const coords = json?.features?.[0]?.geometry?.coordinates;
    if (!coords) return null;
    const [lon, lat] = coords as [number, number];
    return { lat, lon };
  } catch {
    return null;
  }
}

async function getCurrentLocation(): Promise<{
  city: string | null;
  lat: number;
  lon: number;
} | null> {
  if (Platform.OS === "web") {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lon } = pos.coords;
          const city = await reverseGeocodeCity(lat, lon);
          resolve({ city, lat, lon });
        },
        () => resolve(null),
        { timeout: 8000 },
      );
    });
  }
  try {
    const Location = await import("expo-location");
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude: lat, longitude: lon } = pos.coords;
    const city = await reverseGeocodeCity(lat, lon);
    return { city, lat, lon };
  } catch {
    return null;
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AssociationsScreen() {
  const router = useRouter();
  usePageTitle("Associations");

  const [associations, setAssociations] = useState<AssociationPublicItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recherche textuelle
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Localisation : valeur affichée dans l'input + coordonnées réelles
  const [cityInput, setCityInput] = useState("");
  const [isGeolocating, setIsGeolocating] = useState(false);
  const locationRef = useRef<{ lat: number; lon: number } | null>(null);
  const cityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce recherche 400 ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchAssociations = useCallback(
    async (pageToLoad: number, append: boolean) => {
      try {
        append ? setIsLoadingMore(true) : setIsLoading(true);
        setError(null);

        const loc = locationRef.current;
        const result = await getPublicAssociations({
          search: debouncedSearch || undefined,
          lat: loc?.lat,
          lng: loc?.lon,
          radius: loc ? 25 : undefined,
          page: pageToLoad,
          pageSize: PAGE_SIZE,
        });

        setAssociations((prev) =>
          append ? [...prev, ...result.associations] : result.associations,
        );
        setTotal(result.total);
        setPage(pageToLoad);
      } catch {
        setError("Impossible de charger les associations. Réessayez.");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [debouncedSearch],
  );

  useEffect(() => {
    fetchAssociations(1, false);
  }, [fetchAssociations]);

  const hasMore = associations.length < total;

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) fetchAssociations(page + 1, true);
  };

  // Saisie manuelle dans le champ ville → géocode après debounce
  const handleCityChange = (text: string) => {
    setCityInput(text);
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);

    if (!text.trim()) {
      locationRef.current = null;
      return;
    }

    cityDebounceRef.current = setTimeout(async () => {
      const trimmed = text.trim();
      if (trimmed.length >= 2) {
        const coords = await geocodeAddress(trimmed);
        locationRef.current = coords ? { lat: coords.lat, lon: coords.lon } : null;
        // La mise à jour de locationRef déclenche manuellement un nouveau fetch
        fetchAssociations(1, false);
      }
    }, 600);
  };

  // GPS → remplir le champ + obtenir les coordonnées
  const handleGeolocate = async () => {
    setIsGeolocating(true);
    try {
      const loc = await getCurrentLocation();
      if (loc) {
        const city = loc.city ?? "";
        setCityInput(city);
        locationRef.current = { lat: loc.lat, lon: loc.lon };
        fetchAssociations(1, false);
      }
    } finally {
      setIsGeolocating(false);
    }
  };

  const handleAssociationPress = (id: number) => {
    router.push(`/associations/${id}`);
  };

  // Indicateur visuel : le filtre géoloc est actif si on a des coordonnées
  const isLocationActive = locationRef.current !== null;

  // ── Champ ville avec bouton GPS intégré (inspiré de mission-filters) ──────

  const cityField = (
    <Input
      value={cityInput}
      onChangeText={handleCityChange}
      placeholder="Ville ou adresse…"
      returnKeyType="search"
      autoCapitalize="none"
      autoCorrect={false}
      accessibilityLabel="Filtrer par ville ou adresse"
      rightIcon={
        isGeolocating ? (
          <ActivityIndicator size={16} color={colors.primary.default} />
        ) : (
          <LocalisationIcon
            className={clsx(
              "w-5 h-5",
              isLocationActive ? "text-primary" : "text-grey-500",
            )}
          />
        )
      }
      onRightIconPress={isGeolocating ? undefined : handleGeolocate}
      containerClassName="w-full"
    />
  );

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
              Associations
            </Text>
            <Text className="text-base text-grey-600">
              Découvrez les associations qui agissent près de chez vous
            </Text>
          </View>

          {/* Filtres : recherche + localisation */}
          <View className="flex-col gap-3 mb-6 md:flex-row">
            {/* Recherche — flex-1 sur web pour prendre l'espace restant */}
            <View className="flex-1">
              <SearchInput
                value={search}
                onChangeText={setSearch}
                placeholder="Rechercher une association…"
              />
            </View>

            {/* Champ ville + GPS */}
            <View className="flex-1 md:max-w-xs">
              {cityField}
            </View>
          </View>

          {/* Compteur + indicateur de filtre géoloc actif */}
          <View className="flex-row flex-wrap items-center gap-3 mb-6">
            <View className="flex-row items-baseline gap-2">
              <Text className="text-2xl font-bold text-grey-900">
                {isLoading ? "…" : total}
              </Text>
              <Text className="text-base text-grey-600">
                {total <= 1 ? "association" : "associations"}
              </Text>
            </View>

            {isLocationActive && cityInput.length > 0 && (
              <Pressable
                onPress={() => {
                  setCityInput("");
                  locationRef.current = null;
                  fetchAssociations(1, false);
                }}
                className={clsx(
                  "flex-row items-center gap-1 px-2.5 py-1 rounded-full border border-primary bg-white",
                  isWeb && "web:cursor-pointer hover:bg-grey-50",
                )}
              >
                <LocalisationIcon className="w-3.5 h-3.5 text-primary" />
                <Text className="text-xs font-medium text-primary">{cityInput}</Text>
                <Text className="text-xs text-grey-600 ml-0.5">✕</Text>
              </Pressable>
            )}
          </View>

          {/* Contenu */}
          {error ? (
            <View className="items-center justify-center py-16">
              <Text className="mb-4 text-base text-red-600">{error}</Text>
              <Button variant="secondary" onPress={() => fetchAssociations(1, false)}>
                Réessayer
              </Button>
            </View>
          ) : (
            <AssociationGrid
              associations={associations}
              isLoading={isLoading}
              onAssociationPress={handleAssociationPress}
            />
          )}

          {/* Voir plus */}
          {hasMore && !isLoading && !error && (
            <View className="items-center mt-8">
              <Button
                variant="secondary"
                onPress={handleLoadMore}
                loading={isLoadingMore}
              >
                Voir plus d'associations
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
