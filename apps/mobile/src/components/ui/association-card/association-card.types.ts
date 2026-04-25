export interface AssociationCardProps {
  readonly id: number;
  readonly name: string;
  readonly description: string | null;
  readonly logoUrl: string | null;
  readonly category: string | null;
  readonly city: string | null;
  readonly activeMissionsCount: number;
  readonly onPress?: () => void;
  readonly className?: string;
  readonly testID?: string;
}
