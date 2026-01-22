// ----------------------------------------------------------------------
// CONSTANTES & REGEX D'AUTHENTIFICATION
// ----------------------------------------------------------------------

/**
 * Regex simple pour éviter les injections HTML basiques.
 * Interdit strictement les chevrons < et >.
 * Utile pour les champs "Nom", "Prénom", "Ville", etc.
 */
export const NO_HTML_TAGS = /^[^<>]*$/;

/**
 * Regex de complexité de Mot de passe :
 * - (?=.*[a-z])       : Au moins 1 minuscule
 * - (?=.*[A-Z])       : Au moins 1 majuscule
 * - (?=.*\d)          : Au moins 1 chiffre
 * - (?=.*[@$!%*?&])   : Au moins 1 caractère spécial parmi @$!%*?&
 *
 * Note : La longueur n'est pas gérée ici pour séparer les messages d'erreur.
 */
export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;

// --- Limites de longueur (Centralisées pour cohérence) ---

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 50;

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 50;
