import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { FollowStatusResponse } from '@repo/shared';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { AssociationFollowService } from './association-follow.service';

@Controller('associations')
@UseGuards(AuthGuard('jwt'))
export class AssociationFollowController {
  constructor(private readonly followService: AssociationFollowService) {}

  @Post(':id/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  async follow(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) associationId: number,
  ): Promise<void> {
    await this.followService.follow(req.user.id, associationId);
  }

  @Delete(':id/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfollow(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) associationId: number,
  ): Promise<void> {
    await this.followService.unfollow(req.user.id, associationId);
  }

  @Get(':id/follow')
  async getStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) associationId: number,
  ): Promise<FollowStatusResponse> {
    return this.followService.getStatus(req.user.id, associationId);
  }
}
