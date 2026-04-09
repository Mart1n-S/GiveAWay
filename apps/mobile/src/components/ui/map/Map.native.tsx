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
import { getNearbyAssociations } from "@/services/association.service";
import type { NearbyFilters } from "@/services/association.service";
import { MapFilters } from "./MapFilters";
import type { MapFiltersValue } from "./MapFilters";
import type { AssociationMapItem } from "@repo/shared";

const INITIAL_REGION: Region = {
  latitude: 43.52916259033478,
  longitude: 5.442325981514346,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};
const DEBOUNCE_MS = 1000;
const MAX_DESC_LENGTH = 110;

export default function Map() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const centerRef = useRef<[number, number]>([
    INITIAL_REGION.latitude,
    INITIAL_REGION.longitude,
  ]);

  const [associations, setAssociations] = useState<AssociationMapItem[]>([]);
  const [filters, setFilters] = useState<NearbyFilters>({});

  // ---------------------------------------------------------------- fetch ---

  const fetchNearby = useCallback(
    (lat: number, lng: number, activeFilters: NearbyFilters) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          const data = await getNearbyAssociations(lat, lng, 10, activeFilters);
          setAssociations(data);
        } catch (err) {
          console.error("fetchNearby error:", err);
        }
      }, DEBOUNCE_MS);
    },
    [],
  );

  useEffect(() => {
    fetchNearby(INITIAL_REGION.latitude, INITIAL_REGION.longitude, {});
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchNearby]);

  // --------------------------------------------------------- filtres ---

  const handleFiltersChange = useCallback(
    ({ center, filters: newFilters }: MapFiltersValue) => {
      setFilters(newFilters);
      if (center) {
        // Déplace la caméra vers l'adresse sélectionnée
        mapRef.current?.animateToRegion(
          {
            latitude: center[0],
            longitude: center[1],
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          },
          800,
        );
        fetchNearby(center[0], center[1], newFilters);
      } else {
        const [lat, lng] = centerRef.current;
        fetchNearby(lat, lng, newFilters);
      }
    },
    [fetchNearby],
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
        style={{flex: 1}}
        initialRegion={INITIAL_REGION}
        onRegionChangeComplete={(newRegion: Region) => {
          centerRef.current = [newRegion.latitude, newRegion.longitude];
          fetchNearby(newRegion.latitude, newRegion.longitude, filters);
        }}
      >
        {associations.map((assoc) => {
          const excerpt =
            assoc.description && assoc.description.length > MAX_DESC_LENGTH
              ? assoc.description.slice(0, MAX_DESC_LENGTH).trimEnd() + "…"
              : assoc.description;

          return (
            <Marker
              key={assoc.id}
              coordinate={{
                latitude: assoc.latitude,
                longitude: assoc.longitude,
              }}
              pinColor="#CC460F"
            >
              <Callout tooltip={false}>
                <View style={styles.callout}>
                  {/* En-tête */}
                  <Text style={styles.calloutName}>{assoc.name}</Text>
                  {assoc.category && (
                    <Text style={styles.calloutCategory}>{assoc.category}</Text>
                  )}

                  <View style={styles.divider} />

                  {/* Lieu */}
                  <Text style={styles.calloutCity}>📍 {assoc.city}</Text>

                  {/* Description */}
                  {excerpt ? (
                    <Text style={styles.calloutDesc}>{excerpt}</Text>
                  ) : null}

                  {/* Lien */}
                  <TouchableOpacity
                    style={styles.calloutLink}
                    onPress={() => router.push(`/association/${assoc.id}` as never)}
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
  calloutName: {
    fontWeight: "700",
    fontSize: 14,
    color: "#111",
    marginBottom: 2,
  },
  calloutCategory: {
    fontSize: 11,
    fontWeight: "700",
    color: "#CC460F",
    textTransform: "uppercase",
    letterSpacing: 0.4,
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