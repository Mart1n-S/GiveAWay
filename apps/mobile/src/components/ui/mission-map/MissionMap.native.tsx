import { Platform, StyleSheet, View, Linking } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Text } from "../text/text";
import { Button } from "../button/button";
import type { MissionMapProps } from "./MissionMap.types";

// Passer à true une fois la clé Google Maps configurée dans app.config.js
// (android.config.googleMaps.apiKey)
const GOOGLE_MAPS_CONFIGURED = false;

const DELTA = 0.008;

/**
 * Carte simple avec un seul marqueur à l'adresse de la mission.
 * Pas de filtres, pas de clustering — lecture seule.
 */
export function MissionMap({
  latitude,
  longitude,
  address,
  city,
  height = 220,
}: MissionMapProps) {
  const label = [address, city].filter(Boolean).join(", ");

  const openInMaps = () => {
    const query = encodeURIComponent(label || `${latitude},${longitude}`);
    const url =
      Platform.OS === "ios"
        ? `maps://maps.apple.com/?q=${query}&ll=${latitude},${longitude}`
        : `geo:${latitude},${longitude}?q=${query}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps?q=${latitude},${longitude}`);
    });
  };

  // Carte désactivée sur Android tant que la clé Google Maps n'est pas configurée
  if (Platform.OS === "android" && !GOOGLE_MAPS_CONFIGURED) {
    return (
      <View className="gap-3">
        <View style={[styles.placeholder, { height }]}>
          <Text className="text-sm text-grey-500 text-center px-4">
            Carte non disponible sur Android pour le moment.
          </Text>
        </View>
        <View className="items-start">
          <Button variant="secondary" onPress={openInMaps}>
            Ouvrir dans Maps
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className="gap-3">
      <MapView
        style={[styles.map, { height }]}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: DELTA,
          longitudeDelta: DELTA,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        <Marker
          coordinate={{ latitude, longitude }}
          pinColor="#CC460F"
          title={label || undefined}
        />
      </MapView>

      <View className="items-start">
        <Button variant="secondary" onPress={openInMaps}>
          Ouvrir dans Maps
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  placeholder: {
    width: "100%",
    borderRadius: 12,
    backgroundColor: "#f6f7f8",
    alignItems: "center",
    justifyContent: "center",
  },
});
