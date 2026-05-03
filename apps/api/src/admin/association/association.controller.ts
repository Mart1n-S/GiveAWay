import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsValidationPipe } from '../../common/pipes/documents-validation.pipe';
import {
  AdminLogAction,
  AdminRole,
  CreateAssociationAdminDto,
  CreateAssociationAdminSchema,
  RejectAssociationDto,
  RejectAssociationSchema,
  RequestDocumentsDto,
  RequestDocumentsSchema,
  SuspendAssociationDto,
  SuspendAssociationSchema,
  UpdateAssociationAdminDto,
  UpdateAssociationAdminSchema,
} from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { LogAction } from '../../common/decorators/log-action.decorator';
import { AdminLogInterceptor } from '../../common/interceptors/admin-log.interceptor';
import { AdminAssociationService } from './association.service';
import { AssociationStatus } from '../../generated/prisma/client';

@UseGuards(AuthGuard('admin-jwt'), RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
@UseInterceptors(AdminLogInterceptor)
@Controller('admin/associations')
export class AdminAssociationController {
  constructor(private readonly service: AdminAssociationService) {}

  @Get('pending')
  async pending(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.listPending(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get()
  async list(
    @Query('search') search?: string,
    @Query('status') status?: AssociationStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list({
      search,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Get(':id/documents')
  async documents(@Param('id', ParseIntPipe) id: number) {
    return this.service.listDocuments(id);
  }

  @Get('documents/:documentId/download')
  async downloadDocument(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Res() res: Response,
  ) {
    const result = await this.service.getDocumentForDownload(documentId);
    if (result.type === 'redirect') {
      res.redirect(302, result.url);
      return;
    }
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.send(result.buffer);
  }

  @Patch(':id/validate')
  @LogAction(AdminLogAction.VALIDATE_ASSOCIATION, 'ASSOCIATION')
  async validate(@Param('id', ParseIntPipe) id: number) {
    return this.service.validate(id);
  }

  @Patch(':id/reject')
  @LogAction(AdminLogAction.REJECT_ASSOCIATION, 'ASSOCIATION')
  @UsePipes(new ZodValidationPipe(RejectAssociationSchema))
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectAssociationDto,
  ) {
    return this.service.reject(id, dto.reason);
  }

  @Patch(':id/suspend')
  @LogAction(AdminLogAction.SUSPEND_ASSOCIATION, 'ASSOCIATION')
  @UsePipes(new ZodValidationPipe(SuspendAssociationSchema))
  async suspend(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SuspendAssociationDto,
  ) {
    return this.service.suspend(id, dto.reason);
  }

  @Patch(':id/reactivate')
  @LogAction(AdminLogAction.REACTIVATE_ASSOCIATION, 'ASSOCIATION')
  async reactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.reactivate(id);
  }

  @Post(':id/documents')
  @LogAction(AdminLogAction.REQUEST_DOCUMENTS, 'ASSOCIATION')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body('type') type: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Fichier requis');
    }
    const allowedTypes = ['STATUTS', 'RNA_ATTESTATION', 'OFFICE_PROOF'];
    if (!type || !allowedTypes.includes(type)) {
      throw new BadRequestException(
        `Type invalide. Valeurs autorisées : ${allowedTypes.join(', ')}`,
      );
    }
    new DocumentsValidationPipe(true).transform([file]);
    return this.service.uploadDocument(id, type, file);
  }

  @Delete('documents/:documentId')
  async deleteDocument(@Param('documentId', ParseIntPipe) documentId: number) {
    return this.service.deleteDocument(documentId);
  }

  @Post(':id/request-documents')
  @LogAction(AdminLogAction.REQUEST_DOCUMENTS, 'ASSOCIATION')
  @UsePipes(new ZodValidationPipe(RequestDocumentsSchema))
  async requestDocuments(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RequestDocumentsDto,
  ) {
    return this.service.requestDocuments(id, dto.types, dto.message);
  }

  @Post()
  @LogAction(AdminLogAction.CREATE_ASSOCIATION, 'ASSOCIATION')
  @UsePipes(new ZodValidationPipe(CreateAssociationAdminSchema))
  async create(@Body() dto: CreateAssociationAdminDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @LogAction(AdminLogAction.UPDATE_ASSOCIATION, 'ASSOCIATION')
  @UsePipes(new ZodValidationPipe(UpdateAssociationAdminSchema))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAssociationAdminDto,
  ) {
    return this.service.update(id, dto);
  }

  @Get('missions/:missionId')
  async missionDetail(@Param('missionId', ParseIntPipe) missionId: number) {
    return this.service.getMissionById(missionId);
  }

  @Delete('missions/:missionId')
  async deleteMission(
    @Param('missionId', ParseIntPipe) missionId: number,
    @Body('reason') reason?: string,
  ) {
    return this.service.deleteMission(missionId, reason);
  }

  @Delete(':id')
  @LogAction(AdminLogAction.DELETE_ASSOCIATION, 'ASSOCIATION')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason?: string,
  ) {
    return this.service.delete(id, reason);
  }

  /**
   * Suppression DEFINITIVE d'une association refusée (status = REJECTED).
   * Cascade : documents, missions, members. Le compte du propriétaire reste actif
   * et redevient un compte bénévole classique.
   */
  @Delete(':id/purge')
  @LogAction(AdminLogAction.DELETE_ASSOCIATION, 'ASSOCIATION')
  async purge(@Param('id', ParseIntPipe) id: number) {
    return this.service.purge(id);
  }
}
