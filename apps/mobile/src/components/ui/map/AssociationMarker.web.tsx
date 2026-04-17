import type { ComponentType } from "react";
import type { AssociationMapItem } from "@repo/shared";

interface AssociationMarkerWebProps {
  association: AssociationMapItem;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Marker: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Popup: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
}

const styles = {
  popup: {
    minWidth: 200,
    maxWidth: 260,
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
  meta: { flex: 1, minWidth: 0 },
  badge: {
    display: "inline-block" as const,
    padding: "2px 8px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    color: "#fff",
    background: "#6366f1",
    marginBottom: 4,
  },
  title: {
    fontWeight: 700,
    fontSize: 13,
    color: "#111",
    lineHeight: 1.35,
    margin: 0,
  },
  category: {
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
    background: "#6366f1",
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

const MAX_DESC_LENGTH = 100;

export function AssociationMarkerWeb({
  association,
  Marker,
  Popup,
  icon,
}: AssociationMarkerWebProps) {
  const excerpt =
    association.description && association.description.length > MAX_DESC_LENGTH
      ? association.description.slice(0, MAX_DESC_LENGTH).trimEnd() + "…"
      : association.description;

  return (
    <Marker
      position={[association.latitude, association.longitude]}
      icon={icon}
    >
      <Popup>
        <div style={styles.popup}>
          <div style={styles.header}>
            {association.logoUrl ? (
              <img
                src={association.logoUrl}
                alt={association.name}
                style={styles.logo}
              />
            ) : (
              <div style={styles.logoPlaceholder}>🏢</div>
            )}
            <div style={styles.meta}>
              <span style={styles.badge}>Association</span>
              <p style={styles.title}>{association.name}</p>
              {association.category && (
                <p style={styles.category}>{association.category}</p>
              )}
            </div>
          </div>

          <div style={styles.divider} />

          <div style={styles.city}>
            <span>📍</span>
            <span>{association.city}</span>
          </div>

          {excerpt && <p style={styles.description}>{excerpt}</p>}

          {association.website && (
            <a
              href={association.website}
              target="_blank"
              rel="noreferrer"
              style={styles.link}
            >
              Visiter le site →
            </a>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
