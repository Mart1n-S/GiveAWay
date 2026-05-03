// Libellés FR des enums Prisma utilisés côté admin (lecture seule).

export const AVAILABILITY_FREQUENCY: Record<string, string> = {
  HOURS_WEEK: 'Quelques heures par semaine',
  HOURS_MONTH: 'Quelques heures par mois',
  DAYS_WEEK: 'Quelques jours par semaine',
  DAYS_MONTH: 'Quelques jours par mois',
  ONE_DAY: 'Une journée',
  PUNCTUAL: 'Quelques heures (ponctuel)',
};

export const AVAILABILITY_TIME: Record<string, string> = {
  WEEKDAY: 'En semaine',
  WEEKEND: 'Le weekend',
  EVENING: 'En soirée',
  ALL_TIME: 'Peu importe',
};

export const AVAILABILITY_TYPE: Record<string, string> = {
  REMOTE: 'À distance',
  ON_SITE: 'Sur site',
  HYBRID: 'Hybride',
};

export const ACTIVITY_TYPE: Record<string, string> = {
  MISSION: 'Mission',
  EVENT: 'Événement',
  COLLECT: 'Collecte',
  INFO: 'Information',
};

export const DOCUMENT_TYPE: Record<string, string> = {
  STATUTS: "Statuts de l'association",
  RNA_ATTESTATION: "Attestation RNA / récépissé préfecture",
  OFFICE_PROOF: "Justificatif de siège (bail, attestation, etc.)",
};

export const MISSION_FREQUENCY: Record<string, string> = {
  ONCE: 'Ponctuelle',
  DAILY: 'Quotidienne',
  WEEKLY: 'Hebdomadaire',
  MONTHLY: 'Mensuelle',
};

export function fmtList<T extends string>(values: T[] | null | undefined, dict: Record<string, string>): string {
  if (!values || values.length === 0) return '-';
  return values.map((v) => dict[v] ?? v).join(', ');
}

export function fmtEnum(value: string | null | undefined, dict: Record<string, string>): string {
  if (!value) return '-';
  return dict[value] ?? value;
}
