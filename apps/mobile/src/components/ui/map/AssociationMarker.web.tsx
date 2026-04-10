import type { ComponentType } from "react";
import type { AssociationMapItem } from "@repo/shared";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

interface AssociationMarkerProps {
  assoc: AssociationMapItem;
  Marker: ComponentType<Any>;
  Popup: ComponentType<Any>;
  icon: Any;
}

const MAX_DESC_LENGTH = 110;

const styles = {
  popup: {
    minWidth: 220,
    maxWidth: 280,
    fontFamily: "inherit",
  },
  header: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: 10,
    marginBottom: 8,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 6,
    objectFit: "cover" as const,
    flexShrink: 0,
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
  },
  name: {
    fontWeight: 700,
    fontSize: 14,
    color: "#111",
    lineHeight: 1.3,
    margin: 0,
  },
  category: {
    display: "inline-block" as const,
    marginTop: 2,
    fontSize: 11,
    color: "#CC460F",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.4px",
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

export function AssociationMarker({
  assoc,
  Marker,
  Popup,
  icon,
}: AssociationMarkerProps) {
  const excerpt =
    assoc.description && assoc.description.length > MAX_DESC_LENGTH
      ? assoc.description.slice(0, MAX_DESC_LENGTH).trimEnd() + "…"
      : assoc.description;

  return (
    <Marker position={[assoc.latitude, assoc.longitude]} icon={icon}>
      <Popup>
        <div style={styles.popup}>
          {/* En-tête : logo + nom + catégorie */}
          <div style={styles.header}>
            {assoc.logoUrl ? (
              <img src={assoc.logoUrl} alt={assoc.name} style={styles.logo} />
            ) : (
              <div style={styles.logoPlaceholder}>🏢</div>
            )}
            <div>
              <p style={styles.name}>{assoc.name}</p>
              {assoc.category && (
                <span style={styles.category}>{assoc.category}</span>
              )}
            </div>
          </div>

          <div style={styles.divider} />

          {/* Ville */}
          <div style={styles.city}>
            <span>📍</span>
            <span>{assoc.city}</span>
          </div>

          {/* Description */}
          {excerpt && <p style={styles.description}>{excerpt}</p>}

          {/* Lien vers la fiche (route future) */}
          <a
            href={`/association/${assoc.id}`}
            style={styles.link}
          >
            Voir la fiche →
          </a>
        </div>
      </Popup>
    </Marker>
  );
}