import { Controller, Get, Header, Query, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import {
  AdminLogQuerySchema,
  AdminRole,
  BreakdownQuerySchema,
  StatsRangeSchema,
  TimeseriesQuerySchema,
  TopQuerySchema,
} from '@repo/shared';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminStatsService } from './stats.service';

@UseGuards(AuthGuard('admin-jwt'), RolesGuard)
@Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
@Controller('admin/stats')
export class AdminStatsController {
  constructor(private readonly service: AdminStatsService) {}

  @Get('overview')
  @Header('Cache-Control', 'private, max-age=300')
  async overview(@Query() rawQuery: Record<string, string>) {
    const q = StatsRangeSchema.parse(rawQuery);
    return this.service.overview(q.from, q.to);
  }

  @Get('timeseries')
  @Header('Cache-Control', 'private, max-age=300')
  async timeseries(@Query() rawQuery: Record<string, string>) {
    const q = TimeseriesQuerySchema.parse(rawQuery);
    return this.service.timeseries(q);
  }

  @Get('breakdown')
  @Header('Cache-Control', 'private, max-age=300')
  async breakdown(@Query() rawQuery: Record<string, string>) {
    const q = BreakdownQuerySchema.parse(rawQuery);
    return this.service.breakdown(q);
  }

  @Get('top')
  @Header('Cache-Control', 'private, max-age=300')
  async top(@Query() rawQuery: Record<string, string>) {
    const q = TopQuerySchema.parse(rawQuery);
    return this.service.top(q);
  }

  @Get('admin-logs')
  async adminLogs(@Query() rawQuery: Record<string, string>) {
    const q = AdminLogQuerySchema.parse(rawQuery);
    return this.service.adminLogs(q);
  }

  @Get('export/admin-logs.csv')
  async exportLogs(
    @Query() rawQuery: Record<string, string>,
    @Res() res: Response,
  ) {
    // On valide d'abord les filtres avec le schéma standard (limit ≤ 200), puis
    // on relâche le plafond uniquement pour l'export afin de récupérer tout le
    // jeu de données. Le schéma reste strict pour la liste paginée classique.
    const baseQuery = AdminLogQuerySchema.parse(rawQuery);
    const q = { ...baseQuery, page: 1, limit: 5000 };
    const data = await this.service.adminLogs(q);
    const csv = this.service.exportCsv(
      data.items.map((it) => ({
        id: it.id,
        createdAt: it.createdAt.toISOString(),
        action: it.action,
        entityType: it.entityType,
        entityId: it.entityId,
        adminId: it.adminId,
        adminEmail: (it as { admin?: { email?: string } }).admin?.email ?? '',
      })),
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="admin-logs.csv"',
    );
    res.send(csv);
  }
}
