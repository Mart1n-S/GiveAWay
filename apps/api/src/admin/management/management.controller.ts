import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  AdminLogAction,
  AdminRole,
  CreateAdminDto,
  CreateAdminSchema,
  UpdateAdminDto,
  UpdateAdminSchema,
} from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentAdmin,
  CurrentAdminPayload,
} from '../../common/decorators/current-admin.decorator';
import { LogAction } from '../../common/decorators/log-action.decorator';
import { AdminLogInterceptor } from '../../common/interceptors/admin-log.interceptor';
import { AdminManagementService } from './management.service';

// Lecture seule pour les ADMIN (transparence : voir l'équipe).
// Les actions de gestion (create/update/reset/delete) restent réservées au SUPER_ADMIN.
@UseGuards(AuthGuard('admin-jwt'), RolesGuard)
@UseInterceptors(AdminLogInterceptor)
@Controller('admin/admins')
export class AdminManagementController {
  constructor(private readonly service: AdminManagementService) {}

  @Get()
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  list() {
    return this.service.list();
  }

  @Get(':id')
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Post()
  @Roles(AdminRole.SUPER_ADMIN)
  @LogAction(AdminLogAction.CREATE_ADMIN, 'ADMIN')
  @UsePipes(new ZodValidationPipe(CreateAdminSchema))
  create(@Body() dto: CreateAdminDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(AdminRole.SUPER_ADMIN)
  @LogAction(AdminLogAction.UPDATE_ADMIN, 'ADMIN')
  @UsePipes(new ZodValidationPipe(UpdateAdminSchema))
  update(
    @CurrentAdmin() current: CurrentAdminPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdminDto,
  ) {
    return this.service.update(current.id, id, dto);
  }

  @Post(':id/reset-password')
  @Roles(AdminRole.SUPER_ADMIN)
  @LogAction(AdminLogAction.RESET_ADMIN_PASSWORD, 'ADMIN')
  resetPassword(@Param('id', ParseIntPipe) id: number) {
    return this.service.resetPassword(id);
  }

  @Delete(':id')
  @Roles(AdminRole.SUPER_ADMIN)
  @LogAction(AdminLogAction.DELETE_ADMIN, 'ADMIN')
  delete(
    @CurrentAdmin() current: CurrentAdminPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.delete(current.id, id);
  }
}
