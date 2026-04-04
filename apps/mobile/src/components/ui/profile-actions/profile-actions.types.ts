export interface ProfileActionsProps {
  /** Indique si l'utilisateur s'est connecté via Google (pas de mot de passe) */
  isGoogleAccount: boolean;
  onEditPress: () => void;
  onLogoutPress: () => void;
  onDeletePress: () => void;
  onPasswordPress: () => void;
  isLoggingOut?: boolean;
  className?: string;
}
