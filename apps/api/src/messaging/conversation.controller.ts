import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type {
  ConversationListItemDto,
  CreateConversationDto,
  MessageDto,
  MessagesPageDto,
  UnreadCountDto,
} from '@repo/shared';
import { CreateConversationSchema } from '@repo/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { ConversationService } from './conversation.service';
import { MessageService } from './message.service';
import { MessagingEvents } from './messaging.events';

@UseGuards(AuthGuard('jwt'))
@Controller('conversations')
export class ConversationController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
    private readonly events: MessagingEvents,
  ) {}

  /**
   * GET /conversations
   * Liste des conversations du user, triées par dernier message.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async list(
    @Req() req: AuthenticatedRequest,
  ): Promise<ConversationListItemDto[]> {
    return this.conversationService.listConversations(req.user.id);
  }

  /**
   * GET /conversations/unread-count
   * Nombre de conversations ayant au moins 1 message non-lu reçu.
   */
  @Get('unread-count')
  @HttpCode(HttpStatus.OK)
  async unreadCount(@Req() req: AuthenticatedRequest): Promise<UnreadCountDto> {
    return this.conversationService.getUnreadCount(req.user.id);
  }

  /**
   * POST /conversations
   * Crée (ou retourne existante) une conversation avec un autre user
   * dans le contexte d'une association validée.
   * Règle métier : un des deux participants doit être membre de l'asso, l'autre non.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(CreateConversationSchema))
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateConversationDto,
  ): Promise<{
    conversation: ConversationListItemDto;
    firstMessage: MessageDto | null;
  }> {
    const result = await this.conversationService.createConversation(
      req.user.id,
      dto,
    );

    // Si un message initial a été créé : broadcast WS aux 2 participants
    if (result.firstMessage) {
      this.events.broadcastNewMessage(
        result.conversation.id,
        req.user.id,
        result.conversation.otherUser.id,
        result.firstMessage,
      );
    }

    return result;
  }

  /**
   * POST /conversations/with-association/:associationId
   * Crée (ou retourne) une conversation avec le contact principal (OWNER) de l'asso.
   * Permet au bénévole de contacter une association depuis sa fiche publique
   * sans connaître l'identité du membre OWNER.
   */
  @Post('with-association/:associationId')
  @HttpCode(HttpStatus.CREATED)
  async createWithAssociation(
    @Req() req: AuthenticatedRequest,
    @Param('associationId', ParseIntPipe) associationId: number,
    @Body() body: { initialMessage?: string } = {},
  ): Promise<{
    conversation: ConversationListItemDto;
    firstMessage: MessageDto | null;
  }> {
    const recipientId =
      await this.conversationService.findPrimaryContactUserId(associationId);
    const dto: CreateConversationDto = {
      associationId,
      recipientId,
      ...(body.initialMessage ? { initialMessage: body.initialMessage } : {}),
    };
    // Validation Zod manuelle (Body() ne passe pas par le pipe ici)
    const parsed = CreateConversationSchema.safeParse(dto);
    if (!parsed.success) {
      // Re-déclenche l'erreur standard 400 du pipe
      throw new (await import('@nestjs/common')).BadRequestException({
        message: 'Validation failed',
        errors: parsed.error.issues,
      });
    }

    const result = await this.conversationService.createConversation(
      req.user.id,
      parsed.data,
    );
    if (result.firstMessage) {
      this.events.broadcastNewMessage(
        result.conversation.id,
        req.user.id,
        result.conversation.otherUser.id,
        result.firstMessage,
      );
    }
    return result;
  }

  /**
   * GET /conversations/:conversationId/messages?before=<id>&limit=30
   * Historique paginé (ordre décroissant : du plus récent au plus ancien).
   */
  @Get(':conversationId/messages')
  @HttpCode(HttpStatus.OK)
  async getMessages(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ): Promise<MessagesPageDto> {
    const beforeId = before ? Number.parseInt(before, 10) : undefined;
    const lim = limit ? Number.parseInt(limit, 10) : 30;
    return this.messageService.getMessages(
      req.user.id,
      conversationId,
      Number.isFinite(beforeId) ? beforeId : undefined,
      Number.isFinite(lim) ? lim : 30,
    );
  }

  /**
   * POST /conversations/:conversationId/read
   * Marque tous les messages reçus comme lus.
   */
  @Post(':conversationId/read')
  @HttpCode(HttpStatus.OK)
  async markRead(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId', ParseIntPipe) conversationId: number,
  ): Promise<{ messageIds: number[]; readAt: string }> {
    const userId = req.user.id;
    const result = await this.messageService.markConversationRead(
      userId,
      conversationId,
    );

    if (result.messageIds.length > 0) {
      this.events.broadcastMessageRead(
        conversationId,
        userId,
        result.senderIds,
        result.messageIds,
        result.readAt,
      );
    }

    // Met à jour le compteur global du lecteur — source de vérité serveur.
    // Important même si messageIds est vide (ex: conv déjà lue côté serveur
    // mais le client a encore des pastilles affichées) pour synchroniser.
    const { count } = await this.conversationService.getUnreadCount(userId);
    this.events.sendUnreadCount(userId, count);

    return {
      messageIds: result.messageIds,
      readAt: result.readAt.toISOString(),
    };
  }

  /**
   * DELETE /conversations/:id
   * Suppression "douce" pour l'utilisateur appelant : la conversation
   * disparaît de sa liste, mais reste visible pour l'autre participant.
   * Elle réapparaîtra automatiquement si un nouveau message arrive
   * (seuls les messages postérieurs à la suppression seront visibles).
   */
  @Delete(':conversationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDelete(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId', ParseIntPipe) conversationId: number,
  ): Promise<void> {
    await this.conversationService.softDeleteForUser(
      req.user.id,
      conversationId,
    );
  }
}
