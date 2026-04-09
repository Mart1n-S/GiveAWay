import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { getNearbyAssociations } from "@/services/association.service";
import type { NearbyFilters } from "@/services/association.service";
import { AssociationMarker } from "./AssociationMarker.web";
import { MapFilters } from "./MapFilters";
import type { MapFiltersValue } from "./MapFilters";
import { MARKER_SVG } from "./marker-icon.web";
import type { AssociationMapItem } from "@repo/shared";

type ReactLeaflet = typeof import("react-leaflet");
type LeafletLib = typeof import("leaflet");

const INITIAL_CENTER: [number, number] = [43.52916259033478, 5.442325981514346];
const DEBOUNCE_MS = 1000;

export default function Map() {
  const [Leaflet, setLeaflet] = useState<ReactLeaflet | null>(null);
  const [L, setL] = useState<LeafletLib | null>(null);
  const [associations, setAssociations] = useState<AssociationMapItem[]>([]);
  const [filters, setFilters] = useState<NearbyFilters>({});

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Centre courant de la carte — mis à jour par MapEvents et MapController
  const centerRef = useRef<[number, number]>(INITIAL_CENTER);
  // Cible de déplacement demandée par le filtre adresse
  const [targetCenter, setTargetCenter] = useState<[number, number] | null>(
    null,
  );

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

  // ---------------------------------------------------------------- event listeners internes ---

  // Écoute les mouvements de carte via useMap() + Leaflet natif
  const MapEvents = useMemo(() => {
    if (!Leaflet) return null;
    const { useMap } = Leaflet;
    return function MapEvents({
      onCenter,
      activeFilters,
    }: {
      onCenter: (lat: number, lng: number, f: NearbyFilters) => void;
      activeFilters: NearbyFilters;
    }) {
      const map = useMap();

      useEffect(() => {
        const handler = () => {
          const c = map.getCenter();
          centerRef.current = [c.lat, c.lng];
          onCenter(c.lat, c.lng, activeFilters);
        };
        map.on("moveend", handler);
        handler();
        return () => {
          map.off("moveend", handler);
        };
      }, [map, onCenter, activeFilters]);

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

  const associationIcon = useMemo(() => {
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

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ---------------------------------------------------------------- handler filtres ---

  const handleFiltersChange = useCallback(
    ({ center, filters: newFilters }: MapFiltersValue) => {
      setFilters(newFilters);
      if (center) {
        setTargetCenter(center);
        fetchNearby(center[0], center[1], newFilters);
      } else {
        const [lat, lng] = centerRef.current;
        fetchNearby(lat, lng, newFilters);
      }
    },
    [fetchNearby],
  );

  // ---------------------------------------------------------------- render ---

  if (!Leaflet || !associationIcon) return null;

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

        {MapEvents && (
          <MapEvents
            onCenter={fetchNearby}
            activeFilters={filters}
          />
        )}
        {MapController && <MapController target={targetCenter} />}

        {associations.map((assoc) => (
          <AssociationMarker
            key={assoc.id}
            assoc={assoc}
            Marker={Leaflet.Marker}
            Popup={Leaflet.Popup}
            icon={associationIcon}
          />
        ))}
      </MapContainer>
    </div>
  );
}