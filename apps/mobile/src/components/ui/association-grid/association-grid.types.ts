import type { AssociationPublicItem } from "@repo/shared";

export interface AssociationGridProps {
  readonly associations: AssociationPublicItem[];
  readonly isLoading: boolean;
  readonly onAssociationPress?: (id: number) => void;
  readonly className?: string;
}
