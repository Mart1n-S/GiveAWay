import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import MapView, { Callout, Marker, Region } from "react-native-maps";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { MissionService } from "@/services/mission.service";
import { MapFilters } from "./MapFilters";
import type { MapFiltersValue } from "./MapFilters";
import type { MissionMapItem } from "@repo/shared";

const INITIAL_REGION: Region = {
  latitude: 43.52916259033478,
  longitude: 5.442325981514346,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};
const DEBOUNCE_MS = 1000;
const MAX_DESC_LENGTH = 110;

// Badge couleur selon le type
const TYPE_LABELS: Record<MissionMapItem["type"], string> = {
  MISSION: "Mission",
  EVENT: "Événement",
  COLLECT: "Collecte",
  INFO: "Info",
};

export default function Map() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [missions, setMissions] = useState<MissionMapItem[]>([]);

  // ---------------------------------------------------------------- fetch ---

  const fetchMissions = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await MissionService.getMissionsForMap();
        setMissions(data);
      } catch (err) {
        console.error("fetchMissions map error:", err);
      }
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    fetchMissions();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchMissions]);

  // --------------------------------------------------------- filtres ---

  const handleFiltersChange = useCallback(
    ({ center }: MapFiltersValue) => {
      if (center) {
        mapRef.current?.animateToRegion(
          {
            latitude: center[0],
            longitude: center[1],
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          },
          800,
        );
      }
    },
    [],
  );

  // --------------------------------------------------------- placeholder Android dev build ---

  const isNativeBuild =
    Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

  if (Platform.OS === "android" && isNativeBuild) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>🗺️ Carte non disponible</Text>
        <Text style={styles.placeholderSubtext}>
          Clé Google Maps non configurée
        </Text>
      </View>
    );
  }

  // ---------------------------------------------------------------- render ---

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={INITIAL_REGION}
        onRegionChangeComplete={() => fetchMissions()}
      >
        {missions.map((mission) => {
          const excerpt =
            mission.description && mission.description.length > MAX_DESC_LENGTH
              ? mission.description.slice(0, MAX_DESC_LENGTH).trimEnd() + "…"
              : mission.description;

          return (
            <Marker
              key={mission.id}
              coordinate={{
                latitude: mission.latitude,
                longitude: mission.longitude,
              }}
              pinColor="#CC460F"
            >
              <Callout tooltip={false}>
                <View style={styles.callout}>
                  {/* Badge type */}
                  <Text style={styles.calloutType}>
                    {TYPE_LABELS[mission.type]}
                  </Text>

                  {/* Titre */}
                  <Text style={styles.calloutName}>{mission.title}</Text>

                  {/* Association */}
                  <Text style={styles.calloutAssociation}>
                    {mission.association.name}
                  </Text>

                  <View style={styles.divider} />

                  {/* Lieu */}
                  {mission.city && (
                    <Text style={styles.calloutCity}>📍 {mission.city}</Text>
                  )}

                  {/* Description */}
                  {excerpt ? (
                    <Text style={styles.calloutDesc}>{excerpt}</Text>
                  ) : null}

                  {/* Lien vers la fiche */}
                  <TouchableOpacity
                    style={styles.calloutLink}
                    onPress={() =>
                      router.push(`/missions/${mission.id}` as never)
                    }
                  >
                    <Text style={styles.calloutLinkText}>Voir la fiche →</Text>
                  </TouchableOpacity>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      <MapFilters onChange={handleFiltersChange} />
    </View>
  );
}

// ----------------------------------------------------------------- styles ---

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
  callout: {
    minWidth: 200,
    maxWidth: 260,
    padding: 10,
  },
  calloutType: {
    fontSize: 10,
    fontWeight: "700",
    color: "#CC460F",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  calloutName: {
    fontWeight: "700",
    fontSize: 14,
    color: "#111",
    marginBottom: 2,
  },
  calloutAssociation: {
    fontSize: 11,
    color: "#666",
    marginBottom: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#EBEBEB",
    marginVertical: 6,
  },
  calloutCity: {
    fontSize: 12,
    color: "#555",
    marginBottom: 4,
  },
  calloutDesc: {
    fontSize: 12,
    color: "#666",
    lineHeight: 17,
    marginBottom: 6,
  },
  calloutLink: {
    marginTop: 2,
  },
  calloutLinkText: {
    fontSize: 12,
    color: "#CC460F",
    fontWeight: "600",
  },
});
