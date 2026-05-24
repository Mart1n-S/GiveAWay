import { useMemo } from "react";
import { Linking, Platform, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { Button } from "../button/button";
import type { MissionMapProps } from "./MissionMap.types";

const PRIMARY = "#CC460F";
const DEFAULT_ZOOM = 15;

/**
 * Construit une page HTML Leaflet minimale avec un seul marqueur (lecture seule).
 * Tuiles OpenStreetMap, aucune clé API requise.
 */
function buildHtml(
  latitude: number,
  longitude: number,
  popupLabel: string,
): string {
  // Échappement basique pour éviter de casser le HTML.
  const safeLabel = popupLabel
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #f6f7f8; }
  .pin {
    width: 22px; height: 22px; border-radius: 50%;
    background: ${PRIMARY};
    border: 3px solid #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.35);
  }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map', {
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    touchZoom: false,
    boxZoom: false,
    keyboard: false,
  }).setView([${latitude}, ${longitude}], ${DEFAULT_ZOOM});

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(map);

  var icon = L.divIcon({
    html: '<div class="pin"></div>',
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

  var marker = L.marker([${latitude}, ${longitude}], { icon: icon }).addTo(map);
  ${safeLabel ? `marker.bindPopup(${JSON.stringify(safeLabel)});` : ""}
</script>
</body>
</html>`;
}

/**
 * Carte simple avec un seul marqueur à l'adresse de la mission (Leaflet + OSM via WebView).
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

  const html = useMemo(
    () => buildHtml(latitude, longitude, label),
    [latitude, longitude, label],
  );

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

  return (
    <View className="gap-3">
      <View style={[styles.mapContainer, { height }]}>
        <WebView
          originWhitelist={["*"]}
          source={{ html }}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          style={styles.map}
          androidLayerType="hardware"
        />
      </View>

      <View className="items-start">
        <Button variant="secondary" onPress={openInMaps}>
          Ouvrir dans Maps
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f6f7f8",
  },
  map: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
