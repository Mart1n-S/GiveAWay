import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MissionService } from "@/services/mission.service";
import { MissionMarker } from "./MissionMarker.web";
import { MapFilters } from "./MapFilters";
import type { MapFiltersValue } from "./MapFilters";
import { MARKER_SVG } from "./marker-icon.web";
import type { MissionMapItem } from "@repo/shared";

type ReactLeaflet = typeof import("react-leaflet");
type LeafletLib = typeof import("leaflet");

const INITIAL_CENTER: [number, number] = [43.52916259033478, 5.442325981514346];
const DEBOUNCE_MS = 1000;

export default function Map() {
  const [Leaflet, setLeaflet] = useState<ReactLeaflet | null>(null);
  const [L, setL] = useState<LeafletLib | null>(null);
  const [missions, setMissions] = useState<MissionMapItem[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const centerRef = useRef<[number, number]>(INITIAL_CENTER);
  const [targetCenter, setTargetCenter] = useState<[number, number] | null>(
    null,
  );

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

  // ---------------------------------------------------------------- event listeners ---

  const MapEvents = useMemo(() => {
    if (!Leaflet) return null;
    const { useMap } = Leaflet;
    return function MapEvents({
      onMove,
    }: {
      onMove: () => void;
    }) {
      const map = useMap();

      useEffect(() => {
        const handler = () => {
          const c = map.getCenter();
          centerRef.current = [c.lat, c.lng];
          onMove();
        };
        map.on("moveend", handler);
        handler();
        return () => {
          map.off("moveend", handler);
        };
      }, [map, onMove]);

      return null;
    };
  }, [Leaflet]);

  // Déplace la carte vers targetCenter quand le filtre adresse change
  const MapController = useMemo(() => {
    if (!Leaflet) return null;
    const { useMap } = Leaflet;
    return function MapController({
      target,
    }: {
      target: [number, number] | null;
    }) {
      const map = useMap();
      useEffect(() => {
        if (target) map.flyTo(target, 13);
      }, [map, target]);
      return null;
    };
  }, [Leaflet]);

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

  // ---------------------------------------------------------------- chargement Leaflet + missions ---

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

  // Chargement initial des missions
  useEffect(() => {
    fetchMissions();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchMissions]);

  // ---------------------------------------------------------------- handler filtres ---

  const handleFiltersChange = useCallback(
    ({ center }: MapFiltersValue) => {
      if (center) setTargetCenter(center);
    },
    [],
  );

  // ---------------------------------------------------------------- render ---

  if (!Leaflet || !missionIcon) return null;

  const { MapContainer, TileLayer } = Leaflet;

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      {/* Panneau de filtres superposé à la carte */}
      <MapFilters onChange={handleFiltersChange} />

      <MapContainer
        center={INITIAL_CENTER}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {MapEvents && <MapEvents onMove={fetchMissions} />}
        {MapController && <MapController target={targetCenter} />}

        {missions.map((mission) => (
          <MissionMarker
            key={mission.id}
            mission={mission}
            Marker={Leaflet.Marker}
            Popup={Leaflet.Popup}
            icon={missionIcon}
          />
        ))}
      </MapContainer>
    </div>
  );
}
