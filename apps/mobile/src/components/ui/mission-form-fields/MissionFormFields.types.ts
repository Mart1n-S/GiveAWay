import type { Control, FieldValues, FieldErrors } from "react-hook-form";
import type { RefItem } from "@/services/mission.service";
import type { ActivityType } from "@repo/shared";

export interface MissionFormFieldsProps<T extends FieldValues = FieldValues> {
  readonly step: 1 | 2 | 3;
  readonly control: Control<T>;
  readonly skills: RefItem[];
  readonly causes: RefItem[];
  readonly publicTypes: RefItem[];
  readonly volunteerTypes: RefItem[];
  /** Type d'activité sélectionné — conditionne les champs visibles */
  readonly activityType: ActivityType | undefined;
  /** Erreurs du formulaire (pour affichage conditionnel éventuel) */
  readonly errors?: FieldErrors<T>;
}
