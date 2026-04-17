import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import "leaflet/dist/leaflet.css";
import type { MissionMapProps } from "./MissionMap.types";

type LeafletLib = typeof import("leaflet");
type ReactLeaflet = typeof import("react-leaflet");

const PRIMARY = "#CC460F";

const LOADING_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f6f7f8",
  borderRadius: 12,
  color: "#9CA3AF",
  fontSize: 13,
};

/**
 * Carte Leaflet simple avec un seul marqueur à l'adresse de la mission.
 * Pas de filtres, pas de clustering — lecture seule.
 */
export function MissionMap({
  latitude,
  longitude,
  address,
  city,
  height = 220,
}: MissionMapProps) {
  const [Leaflet, setLeaflet] = useState<ReactLeaflet | null>(null);
  const [L, setL] = useState<LeafletLib | null>(null);

  const label = [address, city].filter(Boolean).join(", ");

  useEffect(() => {
    Promise.all([import("react-leaflet"), import("leaflet")]).then(
      ([rl, l]) => {
        setLeaflet(rl);
        setL((l.default ?? l) as LeafletLib);
      },
    );
  }, []);

  const markerIcon = useMemo(() => {
    if (!L) return undefined;
    return L.divIcon({
      html: `<div style="
        width:22px;height:22px;
        background:${PRIMARY};
        border-radius:50%;
        border:3px solid #fff;
        box-shadow:0 2px 8px rgba(0,0,0,0.35);
      "></div>`,
      className: "",
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -14],
    });
  }, [L]);

  const openInMaps = () => {
    window.open(
      `https://www.google.com/maps?q=${latitude},${longitude}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  if (!Leaflet || !markerIcon) {
    return (
      <div style={{ ...LOADING_STYLE, height }}>
        Chargement de la carte…
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup } = Leaflet;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ height, borderRadius: 12, overflow: "hidden" }}>
        <MapContainer
          center={[latitude, longitude]}
          zoom={15}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
          dragging={false}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[latitude, longitude]} icon={markerIcon}>
            {label ? <Popup>{label}</Popup> : null}
          </Marker>
        </MapContainer>
      </div>

      <button
        onClick={openInMaps}
        style={{
          alignSelf: "flex-start",
          padding: "9px 18px",
          border: "1px solid #E5E7EB",
          borderRadius: 6,
          background: "white",
          cursor: "pointer",
          fontSize: 14,
          color: "#374151",
          fontWeight: "500",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "#f9fafb";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "white";
        }}
      >
        Ouvrir dans Google Maps ↗
      </button>
    </div>
  );
}
