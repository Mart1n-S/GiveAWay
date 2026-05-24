import { toast } from 'sonner';

/**
 * Format de l'erreur retournée par le ZodValidationPipe backend :
 *   { message: 'Validation failed', errors: ZodTreeified }
 * où ZodTreeified = { errors: string[], properties?: { [field]: ZodTreeified } }
 */
interface ZodTreeified {
  errors?: string[];
  properties?: Record<string, ZodTreeified>;
}

interface BackendErrorBody {
  message?: string;
  errors?: ZodTreeified | string[];
  statusCode?: number;
}

interface AxiosLikeError {
  response?: { data?: BackendErrorBody; status?: number };
  message?: string;
}

export type FieldErrors = Record<string, string>;

/**
 * Aplatit l'arbre Zod treeified en map { fieldPath: firstMessage }.
 * Ex: { properties: { reason: { errors: ['Trop court'] } } } → { reason: 'Trop court' }
 */
function flattenZodTree(tree: ZodTreeified | undefined, prefix = ''): FieldErrors {
  if (!tree) return {};
  const out: FieldErrors = {};
  if (tree.properties) {
    for (const [key, sub] of Object.entries(tree.properties)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (sub?.errors && sub.errors.length > 0) {
        out[path] = sub.errors[0];
      }
      if (sub?.properties) {
        Object.assign(out, flattenZodTree(sub, path));
      }
    }
  }
  return out;
}

/**
 * Extrait les erreurs d'une réponse Axios :
 * - fieldErrors : map { champ: message } à afficher sous les inputs
 * - generalMessage : message d'erreur global (à afficher en toast)
 *
 * Si l'erreur n'est pas une erreur de validation, fieldErrors est vide
 * et generalMessage contient le message backend (ou un fallback).
 */
export function parseApiError(
  err: unknown,
  fallback = 'Une erreur est survenue',
): { fieldErrors: FieldErrors; generalMessage: string } {
  const e = err as AxiosLikeError;
  const data = e?.response?.data;

  if (data?.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
    const fieldErrors = flattenZodTree(data.errors as ZodTreeified);
    const rootErrors = (data.errors as ZodTreeified).errors ?? [];
    const hasFieldErrors = Object.keys(fieldErrors).length > 0;
    const generalMessage = hasFieldErrors
      ? rootErrors[0] || data.message || 'Veuillez corriger les champs en erreur'
      : rootErrors[0] || data.message || fallback;
    return { fieldErrors, generalMessage };
  }

  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return { fieldErrors: {}, generalMessage: String(data.errors[0]) };
  }

  return { fieldErrors: {}, generalMessage: data?.message || e?.message || fallback };
}

/**
 * Pratique : à passer directement dans onError de useMutation quand il n'y a
 * pas de champs (toast seulement).
 */
export function toastApiError(err: unknown, fallback = 'Une erreur est survenue') {
  const { generalMessage } = parseApiError(err, fallback);
  toast.error(generalMessage);
}
