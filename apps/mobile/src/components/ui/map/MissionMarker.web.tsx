import type { ComponentType } from "react";
import { useState } from "react";
import type { MissionMapItem } from "@repo/shared";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

interface MissionMarkerProps {
  missions: MissionMapItem[];
  Marker: ComponentType<Any>;
  Popup: ComponentType<Any>;
  useMap: () => Any;
  icon: Any;
}

const MAX_DESC_LENGTH = 110;

const TYPE_LABELS: Record<MissionMapItem["type"], string> = {
  MISSION: "Mission",
  EVENT: "Événement",
  COLLECT: "Collecte",
  INFO: "Info",
};

const TYPE_COLORS: Record<MissionMapItem["type"], string> = {
  MISSION: "#00805b",
  EVENT: "#096e9b",
  COLLECT: "#CC460F",
  INFO: "#5d5f70",
};

// ─── CSS scopé au popup ───────────────────────────────────────────────────────

const POPUP_CSS = `
.mm-popup { font-family: inherit; position: relative; }
.mm-popup *, .mm-popup *::before, .mm-popup *::after { box-sizing: border-box; }

/* ── Bouton fermer ─────────────────────────────────────────────────────────── */
.mm-close-btn {
  position: absolute; top: 0; right: 0;
  display: flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 4px;
  background: transparent; border: 1px solid transparent;
  cursor: pointer; color: #888; padding: 0;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
  outline: 2px solid transparent; outline-offset: 2px;
  /* Empêche le bouton de déclencher la fermeture native Leaflet */
  z-index: 1;
}
.mm-close-btn:hover {
  background: #F5F5F5; border-color: #E0E0E0; color: #333;
}
.mm-close-btn:active {
  background: #EBEBEB; border-color: #CACACA;
}
.mm-close-btn:focus-visible {
  outline-color: #0F95CC;
}

/* ── Bouton nav (‹ ›) ──────────────────────────────────────────────────────── */
.mm-nav-btn {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; flex-shrink: 0;
  border: 1px solid #E0E0E0; border-radius: 4px;
  background: #FAFAFA; color: #444;
  cursor: pointer; padding: 0;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
  outline: 2px solid transparent; outline-offset: 2px;
}
.mm-nav-btn:hover:not(:disabled) {
  border-color: #CC460F; background: #FDF4F0; color: #CC460F;
}
.mm-nav-btn:active:not(:disabled) {
  background: #FBE8E1; border-color: #A6390C; color: #A6390C;
}
.mm-nav-btn:focus-visible {
  outline-color: #0F95CC;
}
.mm-nav-btn:disabled {
  opacity: 0.35; cursor: not-allowed;
}

/* ── Bouton Détails ────────────────────────────────────────────────────────── */
.mm-details-btn {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  margin-top: 8px; padding: 8px 14px; width: 100%;
  background: #CC460F; border: 1px solid #CC460F; border-radius: 6px;
  color: #fff; font-size: 13px; font-weight: 700;
  text-decoration: none; text-align: center; cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
  outline: 2px solid transparent; outline-offset: 2px;
}
.leaflet-container a.mm-details-btn { color: #fff; }
.mm-details-btn:hover {
  background: #A6390C; border-color: #A6390C;
}
.mm-details-btn:active {
  background: #7F2B09; border-color: #7F2B09;
}
.mm-details-btn:focus-visible {
  outline-color: #0F95CC;
}
`;

// ─── Styles layout (non-interactifs) ──────────────────────────────────────────

const S = {
  popup: { minWidth: 220, maxWidth: 280 },
  header: {
    display: "flex" as const,
    alignItems: "flex-start" as const,
    gap: 10,
    marginBottom: 8,
    paddingRight: 28, // espace pour le bouton fermer
  },
  logo: {
    width: 40, height: 40, borderRadius: 6,
    objectFit: "cover" as const, flexShrink: 0, marginTop: 2,
  },
  logoPlaceholder: {
    width: 40, height: 40, borderRadius: 6,
    background: "#F0F0F0",
    display: "flex" as const,
    alignItems: "center" as const, justifyContent: "center" as const,
    fontSize: 18, flexShrink: 0, marginTop: 2,
  },
  meta: { flex: 1, minWidth: 0 },
  badge: (type: MissionMapItem["type"]) => ({
    display: "inline-block" as const,
    padding: "2px 8px", borderRadius: 20,
    fontSize: 10, fontWeight: 700,
    textTransform: "uppercase" as const, letterSpacing: "0.5px",
    color: "#fff", background: TYPE_COLORS[type], marginBottom: 4,
  }),
  title: { fontWeight: 700, fontSize: 13, color: "#111", lineHeight: 1.35, margin: 0 },
  assoc: { fontSize: 11, color: "#666", marginTop: 2 },
  divider: { height: 1, background: "#EBEBEB", margin: "8px 0" },
  city: {
    display: "flex" as const, alignItems: "center" as const,
    gap: 4, fontSize: 12, color: "#555", marginBottom: 6,
  },
  description: { fontSize: 12, color: "#666", lineHeight: 1.5, margin: "0 0 8px" },
  nav: {
    display: "flex" as const, flexDirection: "row" as const,
    alignItems: "center" as const, justifyContent: "space-between" as const,
    marginTop: 6, gap: 4,
  },
  navCounter: { fontSize: 11, color: "#888", flex: 1, textAlign: "center" as const },
} as const;

// ─── Icônes SVG inline ────────────────────────────────────────────────────────

const ChevronLeftSvg = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightSvg = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const ArrowRightSvg = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const CloseSvg = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ─── Contenu du popup (composant React pour accéder à useMap) ─────────────────
// useMap() nécessite un composant React enfant dans le contexte MapContainer.

interface PopupContentProps {
  missions: MissionMapItem[];
  currentIndex: number;
  setCurrentIndex: (fn: (i: number) => number) => void;
  useMap: () => Any;
}

function PopupContent({ missions, currentIndex, setCurrentIndex, useMap }: PopupContentProps) {
  const map = useMap();
  const current = missions[Math.min(currentIndex, missions.length - 1)];

  const excerpt =
    current.description && current.description.length > MAX_DESC_LENGTH
      ? current.description.slice(0, MAX_DESC_LENGTH).trimEnd() + "…"
      : current.description;

  const isPrevDisabled = currentIndex === 0;
  const isNextDisabled = currentIndex === missions.length - 1;

  return (
    <div className="mm-popup" style={S.popup}>
      {/* Bouton fermer (remplace celui de Leaflet) */}
      <button
        className="mm-close-btn"
        onClick={() => map.closePopup()}
        aria-label="Fermer"
        type="button"
      >
        <CloseSvg />
      </button>

      {/* En-tête */}
      <div style={S.header}>
        {current.association.logoUrl ? (
          <img src={current.association.logoUrl} alt={current.association.name} style={S.logo} />
        ) : (
          <div style={S.logoPlaceholder} aria-hidden="true">🤝</div>
        )}
        <div style={S.meta}>
          <span style={S.badge(current.type)}>{TYPE_LABELS[current.type]}</span>
          <p style={S.title}>{current.title}</p>
          <p style={S.assoc}>{current.association.name}</p>
        </div>
      </div>

      <div style={S.divider} role="separator" />

      {current.city && (
        <div style={S.city}>
          <span aria-hidden="true">📍</span>
          <span>{current.city}</span>
        </div>
      )}

      {excerpt && <p style={S.description}>{excerpt}</p>}

      {/* Navigation multi-missions */}
      {missions.length > 1 && (
        <div
          style={S.nav}
          role="group"
          aria-label={`Mission ${currentIndex + 1} sur ${missions.length}`}
        >
          <button
            className="mm-nav-btn"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={isPrevDisabled}
            aria-label="Mission précédente"
            type="button"
          >
            <ChevronLeftSvg />
          </button>

          <span style={S.navCounter} aria-live="polite">
            {currentIndex + 1} / {missions.length}
          </span>

          <button
            className="mm-nav-btn"
            onClick={() => setCurrentIndex((i) => Math.min(missions.length - 1, i + 1))}
            disabled={isNextDisabled}
            aria-label="Mission suivante"
            type="button"
          >
            <ChevronRightSvg />
          </button>
        </div>
      )}

      {/* Bouton Détails */}
      <a
        className="mm-details-btn"
        href={`/missions/${current.id}`}
        role="button"
      >
        <span>Détails</span>
        <ArrowRightSvg />
      </a>
    </div>
  );
}

// ─── Composant exporté ────────────────────────────────────────────────────────

export function MissionMarker({
  missions,
  Marker,
  Popup,
  useMap,
  icon,
}: MissionMarkerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = missions[Math.min(currentIndex, missions.length - 1)];

  return (
    <Marker position={[current.latitude, current.longitude]} icon={icon}>
      {/*
       * closeButton={false} — masque le ‹×› natif de Leaflet.
       * Notre propre bouton fermer est rendu dans PopupContent via map.closePopup().
       */}
      <Popup closeButton={false} autoPan={false}>
        <style>{POPUP_CSS}</style>
        <PopupContent
          missions={missions}
          currentIndex={currentIndex}
          setCurrentIndex={setCurrentIndex}
          useMap={useMap}
        />
      </Popup>
    </Marker>
  );
}
