export interface AssociationCardProps {
  id: number;
  name: string;
  description: string | null;
  logoUrl: string | null;
  category: string | null;
  city: string | null;
  activeMissionsCount: number;
  onPress?: () => void;
  className?: string;
  testID?: string;
}
