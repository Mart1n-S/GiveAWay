import type { ComponentType } from "react";
import type { MissionMapItem } from "@repo/shared";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

interface MissionMarkerProps {
  mission: MissionMapItem;
  Marker: ComponentType<Any>;
  Popup: ComponentType<Any>;
  icon: Any;
}

const MAX_DESC_LENGTH = 110;

// Badge couleur selon le type de mission — miroir de typeConfig dans MissionCard
const TYPE_LABELS: Record<MissionMapItem["type"], string> = {
  MISSION: "Mission",
  EVENT: "Événement",
  COLLECT: "Collecte",
  INFO: "Info",
};

const TYPE_COLORS: Record<MissionMapItem["type"], string> = {
  MISSION: "#16a34a",
  EVENT: "#2563eb",
  COLLECT: "#ea580c",
  INFO: "#6b7280",
};

const styles = {
  popup: {
    minWidth: 220,
    maxWidth: 280,
    fontFamily: "inherit",
  },
  header: {
    display: "flex" as const,
    alignItems: "flex-start" as const,
    gap: 10,
    marginBottom: 8,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 6,
    objectFit: "cover" as const,
    flexShrink: 0,
    marginTop: 2,
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 6,
    background: "#F0F0F0",
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    fontSize: 18,
    flexShrink: 0,
    marginTop: 2,
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  badge: (type: MissionMapItem["type"]) => ({
    display: "inline-block" as const,
    padding: "2px 8px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    color: "#fff",
    background: TYPE_COLORS[type],
    marginBottom: 4,
  }),
  title: {
    fontWeight: 700,
    fontSize: 13,
    color: "#111",
    lineHeight: 1.35,
    margin: 0,
  },
  associationName: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },
  divider: {
    height: 1,
    background: "#EBEBEB",
    margin: "8px 0",
  },
  city: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: 4,
    fontSize: 12,
    color: "#555",
    marginBottom: 6,
  },
  description: {
    fontSize: 12,
    color: "#666",
    lineHeight: 1.5,
    margin: "0 0 8px",
  },
  link: {
    display: "inline-block" as const,
    marginTop: 4,
    padding: "5px 12px",
    background: "#CC460F",
    color: "#fff",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    textDecoration: "none",
    textAlign: "center" as const,
    width: "100%",
    boxSizing: "border-box" as const,
  },
} as const;

export function MissionMarker({
  mission,
  Marker,
  Popup,
  icon,
}: MissionMarkerProps) {
  const excerpt =
    mission.description && mission.description.length > MAX_DESC_LENGTH
      ? mission.description.slice(0, MAX_DESC_LENGTH).trimEnd() + "…"
      : mission.description;

  return (
    <Marker position={[mission.latitude, mission.longitude]} icon={icon}>
      <Popup>
        <div style={styles.popup}>
          {/* En-tête : logo association + badge type + titre */}
          <div style={styles.header}>
            {mission.association.logoUrl ? (
              <img
                src={mission.association.logoUrl}
                alt={mission.association.name}
                style={styles.logo}
              />
            ) : (
              <div style={styles.logoPlaceholder}>🤝</div>
            )}
            <div style={styles.meta}>
              <span style={styles.badge(mission.type)}>
                {TYPE_LABELS[mission.type]}
              </span>
              <p style={styles.title}>{mission.title}</p>
              <p style={styles.associationName}>{mission.association.name}</p>
            </div>
          </div>

          <div style={styles.divider} />

          {/* Ville */}
          {mission.city && (
            <div style={styles.city}>
              <span>📍</span>
              <span>{mission.city}</span>
            </div>
          )}

          {/* Description */}
          {excerpt && <p style={styles.description}>{excerpt}</p>}

          {/* Lien vers la fiche mission */}
          <a href={`/missions/${mission.id}`} style={styles.link}>
            Voir la fiche →
          </a>
        </div>
      </Popup>
    </Marker>
  );
}
