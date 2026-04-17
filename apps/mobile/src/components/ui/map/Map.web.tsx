import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MissionMarker } from "./MissionMarker.web";
import { MARKER_SVG } from "./marker-icon.web";
import type { MissionMapItem } from "@repo/shared";

type ReactLeaflet = typeof import("react-leaflet");
type LeafletLib = typeof import("leaflet");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SC = any;

const INITIAL_CENTER: [number, number] = [43.52916259033478, 5.442325981514346];

/** Cluster marker HTML */
function clusterIconHtml(count: number): string {
  return `<div style="
    width:38px;height:38px;border-radius:50%;
    background:#CC460F;color:#fff;
    display:flex;align-items:center;justify-content:center;
    font-weight:700;font-size:13px;
    border:2px solid #fff;
    box-shadow:0 2px 6px rgba(0,0,0,0.3);
  ">${count}</div>`;
}

/** Groupe les missions par coordonnées exactes (5 décimales).
 *  Utilise un plain object pour éviter le conflit de nom avec le composant Map. */
function groupByCoords(items: MissionMapItem[]): MissionMapItem[][] {
  const groups: Record<string, MissionMapItem[]> = {};
  items.forEach((m) => {
    const key = `${Number(m.latitude).toFixed(5)},${Number(m.longitude).toFixed(5)}`;
    groups[key] = [...(groups[key] ?? []), m];
  });
  return Object.values(groups);
}

interface MapProps {
  /** Missions géolocalisées à afficher. */
  missions?: MissionMapItem[];
  /** Indicateur de chargement externe */
  isLoading?: boolean;
  /** ID de la mission sélectionnée */
  selectedMissionId?: number;
  /** Appelé quand l'utilisateur clique sur un marqueur */
  onMissionSelect?: (id: number) => void;
  /** Appelé après chaque changement de viewport avec les IDs visibles */
  onVisibleMissionsChange?: (ids: number[]) => void;
  /** Centre demandé par le parent (ex. géocodage d'une adresse saisie). */
  center?: { lat: number; lon: number };
}

export default function Map({
  missions = [],
  isLoading: isLoadingProp = false,
  onVisibleMissionsChange,
  center,
}: MapProps) {
  const [Leaflet, setLeaflet] = useState<ReactLeaflet | null>(null);
  const [L, setL] = useState<LeafletLib | null>(null);

  // Supercluster state
  const [sc, setSc] = useState<SC>(null);
  const [mapBounds, setMapBounds] = useState<{
    bounds: [number, number, number, number];
    zoom: number;
  } | null>(null);

  // ---------------------------------------------------------------- supercluster ---

  useEffect(() => {
    if (!missions.length) { setSc(null); return; }
    import("supercluster").then((mod) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SC = (mod as any).default ?? mod;
      const instance = new SC({ radius: 60, maxZoom: 16 });
      instance.load(
        missions.map((m) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [m.longitude, m.latitude] },
          properties: { mission: m },
        })),
      );
      setSc(instance);
    }).catch(() => {});
  }, [missions]);

  // ---------------------------------------------------------------- clusters ---

  const clusters = useMemo(() => {
    if (!sc || !mapBounds) return null;
    // Expand bounds by 25% on each side so markers near the edge of the viewport
    // don't unmount (and close their popup) when the map pans slightly (e.g. autoPan).
    const [w, s, e, n] = mapBounds.bounds;
    const dw = (e - w) * 0.25;
    const dh = (n - s) * 0.25;
    return sc.getClusters(
      [w - dw, s - dh, e + dw, n + dh],
      mapBounds.zoom,
    ) as SC[];
  }, [sc, mapBounds]);

  // Grouper les missions non-clusterisées par coordonnées exactes
  const { clusterItems, missionGroups } = useMemo(() => {
    if (!clusters) {
      return { clusterItems: [], missionGroups: groupByCoords(missions) };
    }
    const clusterItemsList: SC[] = [];
    const raw: MissionMapItem[] = [];
    clusters.forEach((item: SC) => {
      if (item.properties.cluster) {
        clusterItemsList.push(item);
      } else {
        raw.push(item.properties.mission as MissionMapItem);
      }
    });
    return { clusterItems: clusterItemsList, missionGroups: groupByCoords(raw) };
  }, [clusters, missions]);

  // ---------------------------------------------------------------- visible missions ---

  useEffect(() => {
    if (!onVisibleMissionsChange || !mapBounds) return;
    const [west, south, east, north] = mapBounds.bounds;
    const ids = missions
      .filter(
        (m) =>
          m.latitude >= south &&
          m.latitude <= north &&
          m.longitude >= west &&
          m.longitude <= east,
      )
      .map((m) => m.id);
    onVisibleMissionsChange(ids);
  }, [mapBounds, missions, onVisibleMissionsChange]);

  // ---------------------------------------------------------------- event listeners ---

  const MapEvents = useMemo(() => {
    if (!Leaflet) return null;
    const { useMap } = Leaflet;
    return function MapEvents({
      onBoundsChange,
    }: {
      onBoundsChange: (state: { bounds: [number, number, number, number]; zoom: number }) => void;
    }) {
      const map = useMap();
      useEffect(() => {
        const handler = () => {
          const b = map.getBounds();
          const z = Math.floor(map.getZoom());
          onBoundsChange({
            bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
            zoom: z,
          });
        };
        map.on("moveend", handler);
        handler();
        return () => { map.off("moveend", handler); };
      }, [map, onBoundsChange]);
      return null;
    };
  }, [Leaflet]);

  // ---------------------------------------------------------------- center controller ---

  /**
   * Composant interne qui déplace la carte vers `center` via flyTo.
   * Doit être rendu à l'intérieur de MapContainer pour accéder à useMap().
   */
  const CenterController = useMemo(() => {
    if (!Leaflet) return null;
    const { useMap } = Leaflet;
    return function CenterController({
      target,
    }: {
      target?: { lat: number; lon: number };
    }) {
      const map = useMap();
      // Mémorise le dernier centre pour éviter les flyTo répétés à mêmes coords.
      const prevRef = useRef<{ lat: number; lon: number } | undefined>(undefined);
      useEffect(() => {
        if (!target) return;
        if (
          prevRef.current?.lat === target.lat &&
          prevRef.current?.lon === target.lon
        )
          return;
        prevRef.current = target;
        map.flyTo([target.lat, target.lon], Math.max(map.getZoom(), 13));
      }, [map, target]);
      return null;
    };
  }, [Leaflet]);

  // ---------------------------------------------------------------- cluster click handler ---

  const ClusterMarker = useMemo(() => {
    if (!Leaflet || !L) return null;
    const { Marker, useMap } = Leaflet;
    return function ClusterMarker({
      cluster,
      scInstance,
    }: {
      cluster: SC;
      scInstance: SC;
    }) {
      const map = useMap();
      const [lng, lat] = cluster.geometry.coordinates;
      const count: number = cluster.properties.point_count;
      const clusterId: number = cluster.properties.cluster_id;
      const icon = L.divIcon({
        html: clusterIconHtml(count),
        className: "",
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });
      return (
        <Marker
          position={[lat, lng]}
          icon={icon}
          eventHandlers={{
            click: () => {
              const zoom = Math.min(scInstance.getClusterExpansionZoom(clusterId), 16);
              map.flyTo([lat, lng], zoom);
            },
          }}
        />
      );
    };
  }, [Leaflet, L]);

  // ---------------------------------------------------------------- icône custom ---

  const missionIcon = useMemo(() => {
    if (!L) return undefined;
    return L.divIcon({
      html: MARKER_SVG,
      className: "",
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -38],
    });
  }, [L]);

  // ---------------------------------------------------------------- chargement Leaflet ---

  useEffect(() => {
    if (typeof window !== "undefined") {
      Promise.all([import("react-leaflet"), import("leaflet")]).then(
        ([rl, l]) => {
          setLeaflet(rl);
          setL((l.default ?? l) as LeafletLib);
        },
      );
    }
  }, []);

  // ---------------------------------------------------------------- render ---

  if (!Leaflet || !missionIcon) return null;

  const { MapContainer, TileLayer } = Leaflet;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", position: "relative" }}>
      {/* Indicateur de chargement externe */}
      {isLoadingProp && (
        <div style={{
          position: "absolute", top: 8, right: 8, zIndex: 1000,
          background: "rgba(255,255,255,0.9)", borderRadius: 8,
          padding: "4px 10px", fontSize: 12, color: "#666",
          boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
        }}>
          Chargement…
        </div>
      )}

      <div style={{ flex: 1, position: "relative" }}>
        <MapContainer
          center={INITIAL_CENTER}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          closePopupOnClick={false}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {MapEvents && (
            <MapEvents onBoundsChange={setMapBounds} />
          )}

          {CenterController && <CenterController target={center} />}

          {/* Clusters géographiques */}
          {clusterItems.map((item: SC) => (
            ClusterMarker && (
              <ClusterMarker
                key={`cluster-${item.properties.cluster_id}`}
                cluster={item}
                scInstance={sc}
              />
            )
          ))}

          {/* Missions — une par groupe de coordonnées identiques */}
          {missionGroups.map((group) => (
            <MissionMarker
              key={`group-${group[0].id}`}
              missions={group}
              Marker={Leaflet.Marker}
              Popup={Leaflet.Popup}
              useMap={Leaflet.useMap}
              icon={missionIcon}
            />
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
