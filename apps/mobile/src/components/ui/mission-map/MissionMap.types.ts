export interface MissionMapProps {
  latitude: number;
  longitude: number;
  /** Texte de rue affiché dans le label / callout */
  address?: string;
  /** Ville affichée dans le label / callout */
  city?: string;
  /** Hauteur de la carte en pixels. Défaut : 220 */
  height?: number;
}
