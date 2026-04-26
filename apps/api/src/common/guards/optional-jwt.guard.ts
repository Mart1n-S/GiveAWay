import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard JWT optionnel : si un token valide est présent, peuple `req.user`.
 * Si le token est absent ou invalide, laisse passer la requête avec `req.user = undefined`.
 *
 * À utiliser sur les endpoints publics qui peuvent enrichir leur réponse
 * pour les utilisateurs authentifiés (ex. : ajout d'un matchScore).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext) {
    return super.canActivate(context) as boolean | Promise<boolean>;
  }

  // Ne lance jamais — retourne `undefined` si pas d'auth, l'utilisateur sinon.
  override handleRequest<TUser = unknown>(
    _err: unknown,
    user: TUser | false,
  ): TUser | undefined {
    return user || undefined;
  }
}
