import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { GuestGuard } from './guards/guest.guard';

@Module({
  imports: [ConfigModule, PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy, // Gère l'Access Token (Route /me, /logout...)
    JwtRefreshStrategy, // Gère le Refresh Token (Route /refresh)
    GuestGuard,
  ],
  exports: [AuthService],
})
export class AuthModule {}
