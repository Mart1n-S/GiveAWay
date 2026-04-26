/**
 * Contenu du SVG ic_marker.svg exporté comme string HTML
 * pour être utilisé dans Leaflet divIcon (web uniquement).
 *
 * Le fichier source est apps/mobile/assets/icons/ic_marker.svg.
 * On ne peut pas l'importer directement car react-native-svg-transformer
 * le convertit en composant React Native, incompatible avec Leaflet.
 */
export const MARKER_SVG = `<svg
  width="36"
  height="36"
  viewBox="0 0 24 24"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));"
>
  <path
    d="M19 10C19 13.9765 12 21 12 21C12 21 5 13.9765 5 10C5 6.02355 8.13401 3 12 3C15.866 3 19 6.02355 19 10Z"
    fill="#CC460F"
    fill-opacity="0.92"
    stroke="#C02020"
    stroke-width="1.2"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <circle
    cx="12"
    cy="10"
    r="3"
    fill="white"
    stroke="white"
    stroke-width="0.5"
  />
</svg>`;

/**
 * Variante mise en avant — marker doré plus large, halo pulsé et étoile
 * centrée. Utilisé pour les missions qui matchent le profil utilisateur
 * (matchScore >= MATCH_THRESHOLD). Le wrapper inclut un anneau pulsé pour
 * que le marker reste visible même dezoomé sans distinguer les détails du SVG.
 */
export const MARKER_SVG_HIGHLIGHTED = `<style>
@keyframes ga-pulse-ring {
  0% { transform: translate(-50%, -50%) scale(0.6); opacity: 0.7; }
  70% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; }
  100% { transform: translate(-50%, -50%) scale(0.6); opacity: 0; }
}
.ga-marker-highlighted {
  position: relative;
  width: 48px; height: 48px;
}
.ga-marker-highlighted::before {
  content: "";
  position: absolute;
  top: 50%; left: 50%;
  width: 100%; height: 100%;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.45);
  animation: ga-pulse-ring 1.8s ease-out infinite;
}
.ga-marker-highlighted svg {
  position: absolute;
  top: 4px; left: 4px;
  filter: drop-shadow(0 3px 8px rgba(245,158,11,0.7));
}
</style>
<div class="ga-marker-highlighted">
  <svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M19 10C19 13.9765 12 21 12 21C12 21 5 13.9765 5 10C5 6.02355 8.13401 3 12 3C15.866 3 19 6.02355 19 10Z"
      fill="#F59E0B"
      fill-opacity="0.98"
      stroke="#B45309"
      stroke-width="1.3"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M12 7.2L13.05 9.4L15.4 9.7L13.65 11.3L14.1 13.6L12 12.5L9.9 13.6L10.35 11.3L8.6 9.7L10.95 9.4L12 7.2Z"
      fill="white"
    />
  </svg>
</div>`;