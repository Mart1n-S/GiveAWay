import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
  UsePipes,
  Res,
  Req,
  UseGuards,
  Ip,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { GuestGuard } from './guards/guest.guard';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  IFileService,
  FILE_SERVICE,
} from '../common/files/interfaces/file-service.interface';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  RegisterSchema,
  LoginDto,
  LoginSchema,
  VerifyEmailDto,
  VerifyEmailSchema,
  ResendVerificationDto,
  ResendVerificationSchema,
  ForgotPasswordDto,
  ForgotPasswordSchema,
  ResetPasswordDto,
  ResetPasswordSchema,
  ChangePasswordDto,
  ChangePasswordSchema,
  AuthResponse,
  User,
} from '@repo/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ImageValidationPipe } from '../common/pipes/image-validation.pipe';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(FILE_SERVICE) private readonly fileService: IFileService,
  ) {}

  // Route: POST /auth/register
  @UseGuards(GuestGuard)
  @Throttle({ default: { limit: 5, ttl: 5 * 60 * 1000 } })
  @Post('register')
  @UseInterceptors(FileInterceptor('profilePicture'))
  async register(
    @Body(new ZodValidationPipe(RegisterSchema)) dto: RegisterDto,
    @UploadedFile(new ImageValidationPipe(false)) file?: Express.Multer.File,
  ) {
    // 1. vérification métier
    // Si l'email est pris, ça coupe ici. On n'upload rien.
    await this.authService.checkEmailAvailability(dto.email);

    let profilePictureUrl: string | undefined;

    // 2. Upload de l'image si fournie
    if (file) {
      const uploadResult = await this.fileService.uploadFile(file, 'avatars');
      profilePictureUrl = uploadResult.publicId;
    }

    // 3. Création de l'utilisateur
    // On prépare le DTO avec l'ID de l'image
    const dtoWithImage = {
      ...dto,
      profilePicture: profilePictureUrl || undefined,
    };

    try {
      return await this.authService.register(dtoWithImage);
    } catch (error) {
      // 4. Filet de sécurité (Rollback)
      if (profilePictureUrl) {
        this.fileService
          .deleteFile(profilePictureUrl)
          .catch((e) => console.error('Erreur nettoyage image', e));
      }
      throw error;
    }
  }

  // Route: POST /auth/verify
  @UseGuards(GuestGuard)
  @Post('verify')
  @HttpCode(200)
  async verifyEmail(
    @Body(new ZodValidationPipe(VerifyEmailSchema)) dto: VerifyEmailDto,
  ) {
    return this.authService.verifyEmail(dto.code);
  }

  // Route: POST /auth/login
  @UseGuards(GuestGuard)
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } }) // 5 requêtes par heure
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @UsePipes(new ZodValidationPipe(LoginSchema))
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: AuthenticatedRequest,
    @Ip() ip: string,
    @Headers('x-client-type') clientType?: string,
  ): Promise<AuthResponse> {
    // Cela gère les cas où user-agent est undefined ou un tableau, sans erreur ESLint.
    const userAgent = `${req.headers['user-agent'] || 'Unknown'}`;

    // On récupère tokens ET user
    const { tokens, user } = await this.authService.login(dto, userAgent, ip);

    // On extrait accessToken et refreshToken
    const { accessToken, refreshToken } = tokens;

    const isProd = process.env.NODE_ENV === 'production';

    // 1. On met TOUJOURS les cookies (pour le Web et comme backup)
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // 2. LOGIQUE CONDITIONNELLE
    // Si le header dit "mobile", on renvoie les tokens dans le JSON + l'User.
    if (clientType === 'mobile') {
      return {
        message: 'Connexion réussie',
        user: user,
        backendTokens: {
          accessToken,
          refreshToken,
          expiresIn: 15 * 60 * 1000,
        },
      };
    }

    // Sinon (Web), on renvoie l'user (les tokens sont dans les cookies)
    return {
      message: 'Connexion réussie',
      user: user,
    };
  }

  // Route: POST /auth/forgot-password
  @UseGuards(GuestGuard)
  @Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } }) // 3 demandes par heure max
  @Post('forgot-password')
  @UsePipes(new ZodValidationPipe(ForgotPasswordSchema))
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // Route: POST /auth/reset-password
  @UseGuards(GuestGuard)
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } }) // 5 tentatives / 15 min
  @Post('reset-password')
  @UsePipes(new ZodValidationPipe(ResetPasswordSchema))
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // Route: POST /auth/change-password
  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } }) // 5 tentatives / 15 min
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(ChangePasswordSchema))
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    // On extrait l'ID de l'utilisateur depuis le token décodé (req.user)
    const userId = req.user.id;

    // 1. On fait le changement en BDD (qui supprime les refresh tokens)
    const result = await this.authService.changePassword(userId, dto);

    // 2. On nettoie les cookies du navigateur pour le déconnecter tout de suite
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    return result;
  }

  // Route: POST /auth/resend-verification
  @UseGuards(GuestGuard)
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } }) // 5 requêtes par heure
  @Post('resend-verification')
  @UsePipes(new ZodValidationPipe(ResendVerificationSchema))
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(dto);
  }

  // Route: POST /auth/logout
  @Throttle({ default: { limit: 5, ttl: 5 * 60 * 1000 } })
  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
    @Body() body: { refreshToken?: string },
  ) {
    const userId = req.user.id;

    const refreshToken = req.cookies['refresh_token'] || body.refreshToken;

    if (userId && refreshToken) {
      await this.authService.logout(userId, refreshToken);
    }

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    return { message: 'Déconnecté avec succès' };
  }

  // Route: POST /auth/refresh
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('x-client-type') clientType?: string,
  ) {
    const userId = req.user.sub;
    const refreshToken = req.user.refreshToken;

    const userAgent = `${req.headers['user-agent'] || 'Unknown'}`;

    const tokens = await this.authService.refreshTokens(
      userId,
      refreshToken,
      userAgent,
      ip,
    );

    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Logique conditionnelle ici aussi
    if (clientType === 'mobile') {
      return {
        message: 'Session rafraîchie',
        backendTokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: 15 * 60 * 1000,
        },
      };
    }

    return { message: 'Session rafraîchie' };
  }

  // Route: GET /auth/me
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getProfile(@Req() req: AuthenticatedRequest): Promise<User> {
    if (!req.user.id) {
      throw new UnauthorizedException('Utilisateur non identifié');
    }

    // Ici, TypeScript sait que req.user.id est un 'number' (plus besoin de !)
    return this.authService.getMe(req.user.id);
  }
}
