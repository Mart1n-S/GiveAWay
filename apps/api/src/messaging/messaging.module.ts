import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { ConversationService } from './conversation.service';
import { MessageService } from './message.service';
import { ConversationController } from './conversation.controller';
import { MessagingGateway } from './messaging.gateway';
import { MessagingEvents } from './messaging.events';
import { MessagingPushService } from './messaging-push.service';
import { WsJwtGuard } from './guards/ws-jwt.guard';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.register({}),
    PrismaModule,
    NotificationModule,
  ],
  controllers: [ConversationController],
  providers: [
    ConversationService,
    MessageService,
    MessagingEvents,
    MessagingPushService,
    MessagingGateway,
    WsJwtGuard,
  ],
  exports: [ConversationService, MessagingEvents],
})
export class MessagingModule {}
