import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  AdminLogAction,
  AdminRole,
  CreateUserAdminDto,
  CreateUserAdminSchema,
  UpdateUserAdminDto,
  UpdateUserAdminSchema,
  UpdateUserStatusDto,
  UpdateUserStatusSchema,
  UserListQuerySchema,
} from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { LogAction } from '../../common/decorators/log-action.decorator';
import { AdminLogInterceptor } from '../../common/interceptors/admin-log.interceptor';
import { AdminUserService } from './user.service';

@UseGuards(AuthGuard('admin-jwt'), RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
@UseInterceptors(AdminLogInterceptor)
@Controller('admin/users')
export class AdminUserController {
  constructor(private readonly service: AdminUserService) {}

  @Get()
  async list(@Query() rawQuery: Record<string, string>) {
    const query = UserListQuerySchema.parse(rawQuery);
    return this.service.list(query as Parameters<typeof this.service.list>[0]);
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Post()
  @LogAction(AdminLogAction.CREATE_USER, 'USER')
  @UsePipes(new ZodValidationPipe(CreateUserAdminSchema))
  async create(@Body() dto: CreateUserAdminDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @LogAction(AdminLogAction.UPDATE_USER, 'USER')
  @UsePipes(new ZodValidationPipe(UpdateUserAdminSchema))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserAdminDto,
  ) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  @LogAction(AdminLogAction.SUSPEND_USER, 'USER')
  @UsePipes(new ZodValidationPipe(UpdateUserStatusSchema))
  async setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.service.setStatus(id, dto.status);
  }

  @Delete(':id')
  @LogAction(AdminLogAction.DELETE_USER, 'USER')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.softDelete(id);
  }
}
