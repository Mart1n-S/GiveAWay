export interface TermsCheckboxProps {
  /**
   * État actuel de la checkbox (vrai si les CGU sont acceptées).
   */
  checked: boolean;

  /**
   * Fonction de rappel déclenchée après la fermeture de la modale.
   * Renvoie `true` si accepté, `false` si refusé.
   */
  onChange: (checked: boolean) => void;

  /**
   * Message d'erreur optionnel (rouge) à afficher sous la checkbox.
   * Utile pour la validation de formulaire (Zod).
   */
  errorMessage?: string;

  /**
   * TestID optionnel pour les tests automatisés (Playwright, Detox, etc.).
   */
  testID?: string;
}

export interface TermsModalProps {
  /**
   * Contrôle la visibilité de la modale.
   */
  visible: boolean;

  /**
   * Action déclenchée lors du clic sur "Je refuse" ou lors de la fermeture native (Android back).
   * Cela doit fermer la modale et décocher la case.
   */
  onClose: () => void;

  /**
   * Action déclenchée lors du clic sur "J'accepte".
   * Ce bouton ne s'active qu'après avoir scrollé en bas.
   */
  onAccept: () => void;
}
