import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { Button } from "@/components/ui";
import { TYPE_COLORS } from "./MissionMarker.native";
import { MATCH_THRESHOLD, type MissionMapItem } from "@repo/shared";

const HIGHLIGHT_COLOR = "#F59E0B";
const HIGHLIGHT_BG = "#FEF3C7";
const HIGHLIGHT_TEXT = "#B45309";
import CloseIconSource from "@assets/icons/ic_close.svg";
import ArrowRightIconSource from "@assets/icons/ic_arrow_right.svg";
import ChevronLeftIconSource from "@assets/icons/ic_chevron_left.svg";
import ChevronRightIconSource from "@assets/icons/ic_chevron_right.svg";
import { cssInterop } from "react-native-css-interop";
import clsx from "clsx";

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

const INITIAL_LAT = 43.52916259033478;
const INITIAL_LON = 5.442325981514346;
const INITIAL_ZOOM = 13;
const MAX_DESC = 110;
const TAB_BAR_BASE_HEIGHT = 60;

const TYPE_LABELS: Record<MissionMapItem["type"], string> = {
  MISSION: "Mission",
  EVENT: "Événement",
  COLLECT: "Collecte",
  INFO: "Info",
};

// ─── Popup overlay (React Native pur — hors WebView) ──────────────────────────

interface MissionPopupProps {
  readonly missions: MissionMapItem[];
  readonly currentIndex: number;
  readonly onIndexChange: (i: number) => void;
  readonly onClose: () => void;
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

  // La mission affichée est-elle un match ?
  const isCurrentMatch =
    typeof current.matchScore === "number" && current.matchScore >= MATCH_THRESHOLD;

  // Combien de missions du groupe sont matchées (pour signaler dans le compteur).
  const matchCount = missions.filter(
    (m) => typeof m.matchScore === "number" && m.matchScore >= MATCH_THRESHOLD,
  ).length;

  return (
    <View
      style={[
        popup.container,
        { bottom: bottomOffset },
        isCurrentMatch && popup.containerHighlighted,
      ]}
    >
      <View style={popup.header}>
        <View style={popup.headerLeft}>
          <Text style={[popup.type, { color }]}>{TYPE_LABELS[current.type]}</Text>
          {isCurrentMatch && (
            <View style={popup.matchBadge}>
              <Text style={popup.matchBadgeText}>
                ★ Recommandé · {current.matchScore}%
              </Text>
            </View>
          )}
        </View>
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

      {missions.length > 1 && (
        <View style={popup.nav}>
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
            {matchCount > 0 ? `  ·  ★ ${matchCount}` : ""}
          </Text>

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
      <Button
        variant="primary"
        onPress={() => router.push(`/missions/${current.id}` as never)}
        className="w-full mt-3"
        icon={<ArrowRightIcon className="w-5 h-5 text-white" />}
      >
        Voir les détails
      </Button>
    </View>
  );
}

// ─── HTML Leaflet (chargé une seule fois dans la WebView) ─────────────────────

const LEAFLET_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #f5f5f5; }
  .pin {
    width: 28px; height: 28px; border-radius: 50%;
    border: 3px solid #fff;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 700; font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    position: relative;
  }
  .pin.highlighted {
    border-color: #F59E0B;
    box-shadow: 0 0 0 4px rgba(245,158,11,0.5), 0 2px 8px rgba(0,0,0,0.3);
    animation: ga-pulse 1.8s ease-out infinite;
  }
  @keyframes ga-pulse {
    0%   { box-shadow: 0 0 0 0 rgba(245,158,11,0.6), 0 2px 8px rgba(0,0,0,0.3); }
    70%  { box-shadow: 0 0 0 12px rgba(245,158,11,0), 0 2px 8px rgba(0,0,0,0.3); }
    100% { box-shadow: 0 0 0 0 rgba(245,158,11,0), 0 2px 8px rgba(0,0,0,0.3); }
  }
  .pin .star {
    position: absolute;
    top: -6px; right: -6px;
    width: 14px; height: 14px; border-radius: 50%;
    background: #F59E0B; color: #fff;
    font-size: 9px; line-height: 14px;
    text-align: center;
    border: 1px solid #fff;
  }
  .marker-cluster-custom {
    width: 40px; height: 40px; border-radius: 50%;
    background: #CC460F; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 13px;
    border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  }
  .marker-cluster-highlighted {
    position: relative;
    width: 44px; height: 44px; border-radius: 50%;
    background: #F59E0B; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 13px;
    border: 2px solid #fff;
    box-shadow: 0 0 0 4px rgba(245,158,11,0.4), 0 2px 8px rgba(0,0,0,0.3);
  }
  .marker-cluster-highlighted .star {
    position: absolute;
    top: -4px; right: -4px;
    width: 18px; height: 18px; border-radius: 50%;
    background: #fff; color: #F59E0B;
    font-size: 11px; line-height: 18px;
    text-align: center;
    border: 1px solid #F59E0B;
    font-weight: 700;
  }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
<script>
(function() {
  function send(payload) {
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }

  var map = L.map('map', { zoomControl: true, attributionControl: true })
    .setView([${INITIAL_LAT}, ${INITIAL_LON}], ${INITIAL_ZOOM});

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19,
  }).addTo(map);

  var cluster = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 60,
    iconCreateFunction: function(c) {
      // Somme du nombre réel de missions (un marker peut grouper plusieurs missions au même point).
      // Si au moins un enfant est highlighted, le cluster prend la teinte dorée.
      var children = c.getAllChildMarkers();
      var total = 0;
      var hasHighlight = false;
      for (var i = 0; i < children.length; i++) {
        total += children[i].options.missionCount || 1;
        if (children[i].options.isHighlighted) {
          hasHighlight = true;
        }
      }
      if (hasHighlight) {
        return L.divIcon({
          html: '<div class="marker-cluster-highlighted">' + total + '<span class="star">★</span></div>',
          className: '',
          iconSize: [44, 44],
        });
      }
      return L.divIcon({
        html: '<div class="marker-cluster-custom">' + total + '</div>',
        className: '',
        iconSize: [40, 40],
      });
    },
  });
  map.addLayer(cluster);

  function groupByCoords(items) {
    var groups = {};
    items.forEach(function(m) {
      var key = Number(m.latitude).toFixed(5) + ',' + Number(m.longitude).toFixed(5);
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    return Object.keys(groups).map(function(k) { return groups[k]; });
  }

  function pinIcon(color, count, highlighted) {
    var label = count > 1 ? String(count) : '';
    var cls = 'pin' + (highlighted ? ' highlighted' : '');
    var star = highlighted ? '<span class="star">★</span>' : '';
    return L.divIcon({
      html: '<div class="' + cls + '" style="background:' + color + '">' + label + star + '</div>',
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  }

  window.__setMissions = function(missions, typeColors, threshold) {
    cluster.clearLayers();
    var groups = groupByCoords(missions);
    var markers = [];
    groups.forEach(function(group) {
      var first = group[0];
      var color = typeColors[first.type] || '#CC460F';
      var ids = group.map(function(m) { return m.id; });
      // Le groupe est mis en avant si AU MOINS UNE de ses missions match.
      var bestScore = 0;
      for (var i = 0; i < group.length; i++) {
        if (typeof group[i].matchScore === 'number' && group[i].matchScore > bestScore) {
          bestScore = group[i].matchScore;
        }
      }
      var highlighted = bestScore >= threshold;
      var marker = L.marker([first.latitude, first.longitude], {
        icon: pinIcon(color, group.length, highlighted),
        missionCount: group.length,
        isHighlighted: highlighted,
      });
      marker.on('click', function() {
        send({ type: 'select', ids: ids });
      });
      markers.push(marker);
    });
    cluster.addLayers(markers);
  };

  window.__setCenter = function(lat, lon) {
    map.flyTo([lat, lon], Math.max(map.getZoom(), 13));
  };

  function emitBounds() {
    var b = map.getBounds();
    send({
      type: 'bounds',
      west: b.getWest(),
      south: b.getSouth(),
      east: b.getEast(),
      north: b.getNorth(),
      zoom: map.getZoom(),
    });
  }

  map.on('moveend', emitBounds);
  map.on('click', function() { send({ type: 'mapClick' }); });

  send({ type: 'ready' });
  emitBounds();
})();
</script>
</body>
</html>`;

// ─── Composant Map ────────────────────────────────────────────────────────────

interface MapProps {
  readonly missions?: MissionMapItem[];
  readonly isLoading?: boolean;
  readonly onMissionSelect?: (id: number) => void;
  readonly onVisibleMissionsChange?: (ids: number[]) => void;
  readonly center?: { lat: number; lon: number };
}

interface BoundsMessage {
  type: "bounds";
  west: number;
  south: number;
  east: number;
  north: number;
  zoom: number;
}
interface SelectMessage {
  type: "select";
  ids: number[];
}
interface ReadyMessage {
  type: "ready";
}
interface MapClickMessage {
  type: "mapClick";
}
type WebMessage = BoundsMessage | SelectMessage | ReadyMessage | MapClickMessage;

export default function MapNative({
  missions = [],
  isLoading: isLoadingProp = false,
  onMissionSelect,
  onVisibleMissionsChange,
  center,
}: MapProps) {
  const webRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);
  const [bounds, setBounds] = useState<{
    west: number;
    south: number;
    east: number;
    north: number;
  } | null>(null);

  const [selectedGroup, setSelectedGroup] = useState<MissionMapItem[] | null>(null);
  const [popupIndex, setPopupIndex] = useState(0);

  useEffect(() => {
    setPopupIndex(0);
  }, [selectedGroup]);

  // Quand les missions changent, ferme le popup et pousse les nouvelles données.
  useEffect(() => {
    setSelectedGroup(null);
    if (!isReady || !webRef.current) return;
    const json = JSON.stringify(missions);
    const colors = JSON.stringify(TYPE_COLORS);
    webRef.current.injectJavaScript(
      `window.__setMissions && window.__setMissions(${json}, ${colors}, ${MATCH_THRESHOLD}); true;`,
    );
  }, [missions, isReady]);

  // Centre demandé par le parent (géocodage adresse).
  useEffect(() => {
    if (!isReady || !center || !webRef.current) return;
    webRef.current.injectJavaScript(
      `window.__setCenter && window.__setCenter(${center.lat}, ${center.lon}); true;`,
    );
  }, [center, isReady]);

  // Calcul des missions visibles dans le viewport.
  useEffect(() => {
    if (!onVisibleMissionsChange || !bounds) return;
    const ids = missions
      .filter(
        (m) =>
          m.latitude >= bounds.south &&
          m.latitude <= bounds.north &&
          m.longitude >= bounds.west &&
          m.longitude <= bounds.east,
      )
      .map((m) => m.id);
    onVisibleMissionsChange(ids);
  }, [bounds, missions, onVisibleMissionsChange]);

  const handleMessage = useCallback(
    (e: WebViewMessageEvent) => {
      let msg: WebMessage;
      try {
        msg = JSON.parse(e.nativeEvent.data) as WebMessage;
      } catch {
        return;
      }
      if (msg.type === "ready") {
        setIsReady(true);
      } else if (msg.type === "bounds") {
        setBounds({
          west: msg.west,
          south: msg.south,
          east: msg.east,
          north: msg.north,
        });
      } else if (msg.type === "mapClick") {
        setSelectedGroup(null);
      } else if (msg.type === "select") {
        const group = missions.filter((m) => msg.ids.includes(m.id));
        if (group.length > 0) {
          setSelectedGroup(group);
          onMissionSelect?.(group[0].id);
        }
      }
    },
    [missions, onMissionSelect],
  );

  return (
    <View style={styles.container}>
      {isLoadingProp && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#CC460F" />
        </View>
      )}

      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html: LEAFLET_HTML }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        style={styles.webview}
        androidLayerType="hardware"
        // Empêche les gestes de scroll de la WebView de remonter au ScrollView parent
        nestedScrollEnabled
      />

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: "100%",
    width: "100%",
    position: "relative",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
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
});

const popup = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 999,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 999,
  },
  containerHighlighted: {
    borderColor: HIGHLIGHT_COLOR,
    shadowColor: HIGHLIGHT_COLOR,
    shadowOpacity: 0.35,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: 8,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  type: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  matchBadge: {
    backgroundColor: HIGHLIGHT_BG,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  matchBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: HIGHLIGHT_TEXT,
    letterSpacing: 0.3,
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
  navCounter: {
    fontSize: 12,
    color: "#9CA3AF",
  },
});
