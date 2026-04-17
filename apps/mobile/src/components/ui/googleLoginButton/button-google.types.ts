export interface GoogleLoginButtonProps {
  /**
   * Fonction déclenchée lors de l'appui sur le bouton
   */
  onPress: () => void;

  /**
   * État de chargement (affiche l'ActivityIndicator)
   */
  loading: boolean;

  /**
   * Désactive le bouton (ex: si le hook n'est pas prêt)
   */
  disabled?: boolean;
}
