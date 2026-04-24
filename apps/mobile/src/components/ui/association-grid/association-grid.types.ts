import type { AssociationPublicItem } from "@repo/shared";

export interface AssociationGridProps {
  associations: AssociationPublicItem[];
  isLoading: boolean;
  onAssociationPress?: (id: number) => void;
  className?: string;
}
