import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  Res,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import {
  AdminAuthResponse,
  AdminChangePasswordDto,
  AdminChangePasswordSchema,
  AdminLoginDto,
  AdminLoginSchema,
} from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { AdminAuthService } from './auth.service';
import { AdminCookieService } from './cookie.service';
import {
  CurrentAdmin,
  CurrentAdminPayload,
} from '../../common/decorators/current-admin.decorator';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly cookieService: AdminCookieService,
  ) {}

  @Throttle({ default: { limit: 3, ttl: 60 * 1000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @UsePipes(new ZodValidationPipe(AdminLoginSchema))
  async login(
    @Body() dto: AdminLoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: AuthenticatedRequest,
    @Ip() ip: string,
    @Headers('x-client-type') clientType?: string,
  ): Promise<AdminAuthResponse> {
    const userAgent = `${req.headers['user-agent'] || 'Unknown'}`;
    const { admin, accessToken, refreshToken } =
      await this.adminAuthService.login(dto, userAgent, ip);
    this.cookieService.setAuthCookies(res, accessToken, refreshToken);
    return this.adminAuthService.buildAuthResponse(
      clientType,
      admin,
      accessToken,
      refreshToken,
      'Connexion admin réussie',
    );
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
    @Body() body: { refreshToken?: string },
  ) {
    const refreshToken =
      (req.cookies &&
        (req.cookies as Record<string, string>)['admin_refresh_token']) ||
      body?.refreshToken;
    if (refreshToken) {
      await this.adminAuthService.logout(admin.id, refreshToken);
    }
    this.cookieService.clearAuthCookies(res);
    return { message: 'Déconnecté' };
  }

  @UseGuards(AuthGuard('admin-jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('x-client-type') clientType?: string,
  ): Promise<AdminAuthResponse> {
    const userAgent = `${req.headers['user-agent'] || 'Unknown'}`;
    const sub = req.user.sub;
    const refreshToken = req.user.refreshToken;
    const tokens = await this.adminAuthService.refresh(
      sub,
      refreshToken,
      userAgent,
      ip,
    );
    this.cookieService.setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
    );
    return this.adminAuthService.buildAuthResponse(
      clientType,
      undefined,
      tokens.accessToken,
      tokens.refreshToken,
      'Session admin rafraîchie',
    );
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('me')
  async me(@CurrentAdmin() admin: CurrentAdminPayload) {
    const found = await this.adminAuthService.prisma.admin.findUniqueOrThrow({
      where: { id: admin.id },
    });
    return { admin: this.adminAuthService.mapAdminToResponse(found) };
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(AdminChangePasswordSchema))
  async changePassword(
    @CurrentAdmin() admin: CurrentAdminPayload,
    @Body() dto: AdminChangePasswordDto,
  ) {
    await this.adminAuthService.changePassword(
      admin.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return { message: 'Mot de passe modifié' };
  }
}
