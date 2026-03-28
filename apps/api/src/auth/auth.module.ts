import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { FilesModule } from '../common/files/files.module';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { GuestGuard } from './guards/guest.guard';
import { CookieService } from './shared/cookie.service';
import { LogoutController } from './logout/logout.controller';
import { LogoutService } from './logout/logout.service';
import { TokenController } from './token/token.controller';
import { TokenService } from './token/token.service';
import { EmailVerificationController } from './email-verification/email-verification.controller';
import { EmailVerificationService } from './email-verification/email-verification.service';
import { PasswordController } from './password/password.controller';
import { PasswordService } from './password/password.service';
import { LoginController } from './login/login.controller';
import { LoginService } from './login/login.service';
import { RegisterController } from './register/register.controller';
import { RegisterService } from './register/register.service';

@Module({
  imports: [ConfigModule, PassportModule, JwtModule.register({}), FilesModule],
  controllers: [
    LogoutController,
    TokenController,
    EmailVerificationController,
    PasswordController,
    LoginController,
    RegisterController,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    GuestGuard,
    CookieService,
    LogoutService,
    TokenService,
    EmailVerificationService,
    PasswordService,
    LoginService,
    RegisterService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
