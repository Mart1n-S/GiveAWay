import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui";
import MapView, { Marker, Region } from "react-native-maps";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { MissionService } from "@/services/mission.service";
import { MissionMarkerNative, TYPE_COLORS } from "./MissionMarker.native";
import type { MissionListQuery, MissionMapItem } from "@repo/shared";
import CloseIconSource from "@assets/icons/ic_close.svg";
import ArrowRightIconSource from "@assets/icons/ic_arrow_right.svg";
import ChevronLeftIconSource from "@assets/icons/ic_chevron_left.svg";
import ChevronRightIconSource from "@assets/icons/ic_chevron_right.svg";
import { cssInterop } from "react-native-css-interop";
import clsx from "clsx";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Supercluster = require("supercluster");

const iconConfig = {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
} as const;

const CloseIcon = cssInterop(CloseIconSource, iconConfig);
const ArrowRightIcon = cssInterop(ArrowRightIconSource, iconConfig);
const ChevronLeftIcon = cssInterop(ChevronLeftIconSource, iconConfig);
const ChevronRightIcon = cssInterop(ChevronRightIconSource, iconConfig);

const INITIAL_REGION: Region = {
  latitude: 43.52916259033478,
  longitude: 5.442325981514346,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};
const DEBOUNCE_MS = 1000;
const MAX_DESC = 110;

const TYPE_LABELS: Record<MissionMapItem["type"], string> = {
  MISSION: "Mission",
  EVENT: "Événement",
  COLLECT: "Collecte",
  INFO: "Info",
};

/** Zoom Leaflet approximatif à partir du longitudeDelta */
function regionToZoom(longitudeDelta: number): number {
  return Math.round(Math.log2(360 / longitudeDelta));
}

/** Groupe les missions par coordonnées exactes (5 décimales). */
function groupByCoords(items: MissionMapItem[]): MissionMapItem[][] {
  const groups: Record<string, MissionMapItem[]> = {};
  items.forEach((m) => {
    const key = `${Number(m.latitude).toFixed(5)},${Number(m.longitude).toFixed(5)}`;
    groups[key] = [...(groups[key] ?? []), m];
  });
  return Object.values(groups);
}

// ─── Popup overlay ────────────────────────────────────────────────────────────
// Rendu en dehors du contexte natif MapView → tous les composants RN fonctionnent.

// Hauteur fixe de la bottom tab bar (voir apps/mobile/app/(main)/_layout.tsx)
const TAB_BAR_BASE_HEIGHT = 60;

interface MissionPopupProps {
  missions: MissionMapItem[];
  currentIndex: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}

function MissionPopup({
  missions,
  currentIndex,
  onIndexChange,
  onClose,
}: MissionPopupProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const current = missions[Math.min(currentIndex, missions.length - 1)];
  const color = TYPE_COLORS[current.type];

  // Dans MissionPopup
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) onIndexChange(currentIndex - 1);
  }, [currentIndex, onIndexChange]);

  const handleNext = useCallback(() => {
    if (currentIndex < missions.length - 1) onIndexChange(currentIndex + 1);
  }, [currentIndex, missions.length, onIndexChange]);

  const excerpt =
    current.description && current.description.length > MAX_DESC
      ? current.description.slice(0, MAX_DESC).trimEnd() + "…"
      : current.description;

  const isPrevDisabled = currentIndex === 0;
  const isNextDisabled = currentIndex === missions.length - 1;

  const bottomOffset = TAB_BAR_BASE_HEIGHT + insets.bottom + 8;

  return (
    <View style={[popup.container, { bottom: bottomOffset }]}>
      {/* En-tête : badge type + bouton fermer */}
      <View style={popup.header}>
        <Text style={[popup.type, { color }]}>{TYPE_LABELS[current.type]}</Text>
        <Button
          variant="tertiary"
          onPress={onClose}
          accessibilityLabel="Fermer"
          className="px-0 rounded-full h-7 w-7"
          icon={
            <CloseIcon className="w-5 h-5 text-primary group-hover:text-primary-hover group-active:text-primary-active" />
          }
        ></Button>
      </View>

      {/* Titre + association */}
      <Text style={popup.title} numberOfLines={2}>
        {current.title}
      </Text>
      <Text style={popup.association}>{current.association.name}</Text>

      {current.city ? <Text style={popup.city}>📍 {current.city}</Text> : null}

      {excerpt ? (
        <Text style={popup.desc} numberOfLines={3}>
          {excerpt}
        </Text>
      ) : null}

      {/* Navigation multi-missions (même coordonnées) */}
      {missions.length > 1 && (
        <View style={popup.nav}>
          {/* Bouton Précédent */}
          <Pressable
            onPress={handlePrev}
            disabled={isPrevDisabled}
            className={clsx(
              "w-[44px] h-[44px] items-center justify-center rounded-lg border transition-colors",
              isPrevDisabled
                ? "bg-grey-100 border-grey-100"
                : "bg-white border-primary active:bg-white-active",
            )}
          >
            <ChevronLeftIcon
              className={clsx(
                "w-5 h-5",
                isPrevDisabled ? "text-grey-400" : "text-primary",
              )}
            />
          </Pressable>

          <Text style={popup.navCounter}>
            {currentIndex + 1} / {missions.length}
          </Text>

          {/* Bouton Suivant */}
          <Pressable
            onPress={handleNext}
            disabled={isNextDisabled}
            className={clsx(
              "w-[44px] h-[44px] items-center justify-center rounded-lg group border transition-colors",
              isNextDisabled
                ? "bg-grey-100 border-grey-100"
                : "bg-white border-primary active:bg-white-active active:border-primary-active",
            )}
          >
            <ChevronRightIcon
              className={clsx(
                "w-5 h-5",
                isNextDisabled
                  ? "text-grey-400"
                  : "text-primary group-active:text-primary-active",
              )}
            />
          </Pressable>
        </View>
      )}
      {/* CTA Détails */}
      <Button
        variant="primary"
        onPress={() => router.push(`/missions/${current.id}` as never)}
        className="w-full mt-3"
        icon={
          <ArrowRightIcon className="w-5 h-5 text-white" />
        }
      >
        Voir les détails
      </Button>
    </View>
  );
}

// ─── Composant Map ────────────────────────────────────────────────────────────

interface MapProps {
  missions?: MissionMapItem[];
  isLoading?: boolean;
  filters?: MissionListQuery;
  selectedMissionId?: number;
  onMissionSelect?: (id: number) => void;
  onVisibleMissionsChange?: (ids: number[]) => void;
  /** Centre demandé par le parent (ex. géocodage d'une adresse saisie). */
  center?: { lat: number; lon: number };
}

export default function Map({
  missions: missionsProp,
  isLoading: isLoadingProp = false,
  filters,
  onMissionSelect,
  onVisibleMissionsChange,
  center,
}: MapProps) {
  const mapRef = useRef<MapView>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [localMissions, setLocalMissions] = useState<MissionMapItem[]>([]);
  const [fetchError, setFetchError] = useState(false);
  const [region, setRegion] = useState<Region>(INITIAL_REGION);

  // Popup overlay state
  const [selectedGroup, setSelectedGroup] = useState<MissionMapItem[] | null>(
    null,
  );
  const [popupIndex, setPopupIndex] = useState(0);

  const missions = missionsProp ?? localMissions;

  // ---------------------------------------------------------------- fetch autonome ---

  const fetchMissions = useCallback(() => {
    if (missionsProp !== undefined) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await MissionService.getMissionsForMap(filters ?? {});
        setLocalMissions(data);
        setFetchError(false);
      } catch {
        setFetchError(true);
      }
    }, DEBOUNCE_MS);
  }, [missionsProp, filters]);

  useEffect(() => {
    fetchMissions();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchMissions]);

  // Réinitialise l'index quand on sélectionne un nouveau groupe
  useEffect(() => {
    setPopupIndex(0);
  }, [selectedGroup]);

  // Ferme le popup quand les missions changent (nouveau chargement)
  useEffect(() => {
    setSelectedGroup(null);
  }, [missions]);

  // Déplace la carte vers le centre demandé par le parent (géocodage adresse).
  useEffect(() => {
    if (!center) return;
    mapRef.current?.animateToRegion(
      {
        latitude: center.lat,
        longitude: center.lon,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      },
      500,
    );
  }, [center]);

  // --------------------------------------------------------- clustering ---

  const sc = useMemo(() => {
    if (!missions.length) return null;
    try {
      const instance = new Supercluster({ radius: 60, maxZoom: 16 });
      instance.load(
        missions.map((m) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [m.longitude, m.latitude] },
          properties: { mission: m },
        })),
      );
      return instance;
    } catch {
      return null;
    }
  }, [missions]);

  const clusters = useMemo(() => {
    if (!sc) {
      return missions.map((m) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [m.longitude, m.latitude],
        },
        properties: { mission: m, cluster: false },
      }));
    }
    const zoom = Math.max(0, Math.min(20, regionToZoom(region.longitudeDelta)));
    const bbox: [number, number, number, number] = [
      region.longitude - region.longitudeDelta / 2,
      region.latitude - region.latitudeDelta / 2,
      region.longitude + region.longitudeDelta / 2,
      region.latitude + region.latitudeDelta / 2,
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return sc.getClusters(bbox, zoom) as any[];
  }, [sc, region, missions]);

  const { clusterItems, missionGroups } = useMemo(() => {
    const clusterItemsList: typeof clusters = [];
    const raw: MissionMapItem[] = [];
    clusters.forEach((item) => {
      if (item.properties.cluster) {
        clusterItemsList.push(item);
      } else {
        raw.push(item.properties.mission as MissionMapItem);
      }
    });
    return {
      clusterItems: clusterItemsList,
      missionGroups: groupByCoords(raw),
    };
  }, [clusters]);

  // --------------------------------------------------------- visible missions ---

  useEffect(() => {
    if (!onVisibleMissionsChange) return;
    const visibleIds = missions
      .filter(
        (m) =>
          m.latitude >= region.latitude - region.latitudeDelta / 2 &&
          m.latitude <= region.latitude + region.latitudeDelta / 2 &&
          m.longitude >= region.longitude - region.longitudeDelta / 2 &&
          m.longitude <= region.longitude + region.longitudeDelta / 2,
      )
      .map((m) => m.id);
    onVisibleMissionsChange(visibleIds);
  }, [region, missions, onVisibleMissionsChange]);

  // --------------------------------------------------------- placeholder ---

  const isNativeBuild =
    Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

  if (Platform.OS === "android" && isNativeBuild) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Carte non disponible</Text>
        <Text style={styles.placeholderSubtext}>
          Clé Google Maps non configurée
        </Text>
      </View>
    );
  }

  // ---------------------------------------------------------------- render ---

  const handleMarkerPress = (group: MissionMapItem[]) => {
    setSelectedGroup(group);
    onMissionSelect?.(group[0].id);
  };

  return (
    <View style={styles.container}>
      {fetchError && missionsProp === undefined && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            Impossible de charger les missions. Vérifiez votre connexion.
          </Text>
        </View>
      )}

      {isLoadingProp && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#CC460F" />
        </View>
      )}

      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={INITIAL_REGION}
        // Ferme le popup quand on tape sur le fond de la carte
        onPress={() => setSelectedGroup(null)}
        onRegionChangeComplete={(r: Region) => {
          setRegion(r);
          fetchMissions();
        }}
      >
        {/* Clusters géographiques */}
        {clusterItems.map((item) => {
          const [lng, lat] = item.geometry.coordinates;
          const count: number = item.properties.point_count;
          const clusterId: number = item.properties.cluster_id;
          return (
            <Marker
              key={`cluster-${clusterId}`}
              coordinate={{ latitude: lat, longitude: lng }}
              onPress={() => {
                if (!sc) return;
                setSelectedGroup(null);
                const expansionZoom = Math.min(
                  sc.getClusterExpansionZoom(clusterId),
                  16,
                );
                const delta = 360 / Math.pow(2, expansionZoom);
                mapRef.current?.animateToRegion(
                  {
                    latitude: lat,
                    longitude: lng,
                    latitudeDelta: delta,
                    longitudeDelta: delta,
                  },
                  400,
                );
              }}
            >
              <View style={styles.clusterMarker}>
                <Text style={styles.clusterCount}>{count}</Text>
              </View>
            </Marker>
          );
        })}

        {/* Missions — une par groupe de coordonnées identiques */}
        {missionGroups.map((group) => (
          <MissionMarkerNative
            key={`group-${group[0].id}`}
            missions={group}
            isSelected={
              selectedGroup !== null &&
              group[0].id === selectedGroup[0].id
            }
            onPress={handleMarkerPress}
          />
        ))}
      </MapView>

      {/* Popup overlay — rendu hors du contexte natif MapView */}
      {selectedGroup !== null && (
        <MissionPopup
          missions={selectedGroup}
          currentIndex={popupIndex}
          onIndexChange={setPopupIndex}
          onClose={() => setSelectedGroup(null)}
        />
      )}
    </View>
  );
}

// ─── Styles Map ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: "100%",
    width: "100%",
    position: "relative",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
  },
  placeholderSubtext: {
    fontSize: 13,
    color: "#999",
    marginTop: 8,
  },
  errorBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: "#FEE2E2",
    padding: 8,
    alignItems: "center",
  },
  errorText: {
    fontSize: 13,
    color: "#991B1B",
    textAlign: "center",
  },
  loadingOverlay: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 999,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    padding: 6,
  },
  clusterMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#CC460F",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  clusterCount: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
});

// ─── Styles Popup ─────────────────────────────────────────────────────────────

const popup = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 999,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 999,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  type: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 3,
  },
  association: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  city: {
    fontSize: 12,
    color: "#4B5563",
    marginBottom: 6,
  },
  desc: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 17,
    marginBottom: 10,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  // navBtn: {
  //   width: 44,
  //   height: 44,
  //   alignItems: "center",
  //   justifyContent: "center",
  //   borderRadius: 8,
  //   borderWidth: 1,
  //   borderColor: "#E5E7EB",
  //   backgroundColor: "#FAFAFA",
  // },
  // navBtnPressed: {
  //   backgroundColor: "#FEF2EB",
  //   borderColor: "#CC460F",
  // },
  // navBtnDisabled: {
  //   opacity: 0.35,
  // },
  // navBtnText: {
  //   fontSize: 22,
  //   color: "#374151",
  //   lineHeight: 26,
  // },
  navCounter: {
    fontSize: 12,
    color: "#9CA3AF",
  },
});
