import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class GuestGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    // On regarde si un token est présent dans les cookies
    const token = req.cookies['access_token'] as string | undefined;

    // S'il n'y a pas de token, c'est un invité, on laisse passer
    if (!token) {
      return true;
    }

    try {
      // S'il y a un token, on vérifie s'il est valide
      const secret = this.config.get<string>('JWT_ACCESS_SECRET');
      await this.jwtService.verifyAsync(token, { secret });

      // Si verifyAsync ne plante pas, le token est valide => L'user est connecté.
      // On lui INTERDIT l'accès aux pages qui nécessitent d'être déconnecté.
      throw new ForbiddenException('Vous êtes déjà connecté.');
    } catch (error) {
      // Si le token est invalide ou expiré, on considère l'user comme déconnecté.
      // On le laisse passer (pour qu'il puisse se reconnecter).
      if (error instanceof ForbiddenException) {
        throw error;
      }
      return true;
    }
  }
}
