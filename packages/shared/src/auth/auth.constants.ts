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
 * (?=.*[a-z])  -> Au moins 1 minuscule
 * (?=.*[A-Z])  -> Au moins 1 majuscule
 * (?=.*\d)     -> Au moins 1 chiffre
 * (?=.*[\W_])  -> Au moins 1 caractère spécial (n'importe lequel : ! @ # € % ^ & * etc.)
 * .+$          -> Autorise n'importe quel caractère pour le reste
 *
 * Note : La longueur n'est pas gérée ici pour séparer les messages d'erreur.
 */
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/;

// --- Limites de longueur (Centralisées pour cohérence) ---

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 50;

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 50;

/**
 * Regex pour les noms : Lettres, Accents, Tiret, Apostrophe, Espace
 * ^ et $ = début et fin de chaine
 * a-zA-Z = lettres standard
 * À-ÿ = plage unicode pour les caractères accentués (é, è, ç, etc.)
 * \s = espace
 * \- = tiret
 * \' = apostrophe
 */
export const NAME_REGEX = /^[a-zA-ZÀ-ÿ\s\-\']+$/;

/**
 * Fonction utilitaire pour formater les Prénoms (Title Case)
 * Ex: "jean-pierre" -> "Jean-Pierre", "d'artagnan" -> "D'Artagnan"
 */
export const formatFirstName = (val: string) => {
  if (!val) return val;

  return val.toLowerCase().replace(/(?:^|[\s\-\'])([a-zA-ZÀ-ÿ])/g, (match) => {
    return match.toUpperCase();
  });
};
