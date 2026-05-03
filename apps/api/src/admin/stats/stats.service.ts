import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AssociationStatus,
  MissionStatus,
  UserStatus,
} from '../../generated/prisma/client';
import {
  BreakdownQueryDto,
  DashboardOverview,
  KpiValue,
  TimeseriesPoint,
  TimeseriesQueryDto,
  TopQueryDto,
} from '@repo/shared';

interface RangeBounds {
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
}

function resolveRange(from?: string, to?: string): RangeBounds {
  const now = new Date();
  const toDate = to ? new Date(to) : now;
  const fromDate = from
    ? new Date(from)
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const span = toDate.getTime() - fromDate.getTime();
  const prevTo = new Date(fromDate.getTime());
  const prevFrom = new Date(fromDate.getTime() - span);
  return { from: fromDate, to: toDate, prevFrom, prevTo };
}

function kpi(value: number, prev: number): KpiValue {
  const delta = value - prev;
  const deltaPct = prev === 0 ? null : (delta / prev) * 100;
  return { value, delta, deltaPct };
}

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(from?: string, to?: string): Promise<DashboardOverview> {
    const r = resolveRange(from, to);

    const [
      activeUsers,
      newSignups,
      newSignupsPrev,
      validatedAssos,
      validatedAssosPrev,
      pendingAssos,
      pendingAssosPrev,
      activeMissions,
      activeMissionsPrev,
      participations,
      participationsPrev,
      validatedInRange,
      rejectedInRange,
      validatedInRangePrev,
      rejectedInRangePrev,
    ] = await Promise.all([
      this.prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      this.prisma.user.count({
        where: { createdAt: { gte: r.from, lte: r.to } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: r.prevFrom, lte: r.prevTo } },
      }),
      this.prisma.association.count({
        where: { status: AssociationStatus.VALIDATED },
      }),
      this.prisma.association.count({
        where: {
          status: AssociationStatus.VALIDATED,
          updatedAt: { lte: r.prevTo },
        },
      }),
      this.prisma.association.count({
        where: { status: AssociationStatus.PENDING },
      }),
      this.prisma.association.count({
        where: {
          status: AssociationStatus.PENDING,
          updatedAt: { lte: r.prevTo },
        },
      }),
      this.prisma.mission.count({ where: { status: MissionStatus.ACTIVE } }),
      this.prisma.mission.count({
        where: { status: MissionStatus.ACTIVE, createdAt: { lte: r.prevTo } },
      }),
      this.prisma.missionParticipant.count({
        where: { createdAt: { gte: r.from, lte: r.to } },
      }),
      this.prisma.missionParticipant.count({
        where: { createdAt: { gte: r.prevFrom, lte: r.prevTo } },
      }),
      this.prisma.association.count({
        where: {
          status: AssociationStatus.VALIDATED,
          updatedAt: { gte: r.from, lte: r.to },
        },
      }),
      this.prisma.association.count({
        where: {
          status: AssociationStatus.REJECTED,
          updatedAt: { gte: r.from, lte: r.to },
        },
      }),
      this.prisma.association.count({
        where: {
          status: AssociationStatus.VALIDATED,
          updatedAt: { gte: r.prevFrom, lte: r.prevTo },
        },
      }),
      this.prisma.association.count({
        where: {
          status: AssociationStatus.REJECTED,
          updatedAt: { gte: r.prevFrom, lte: r.prevTo },
        },
      }),
    ]);

    const ratio = (a: number, b: number) =>
      a + b === 0 ? 0 : (a / (a + b)) * 100;
    const rate = ratio(validatedInRange, rejectedInRange);
    const ratePrev = ratio(validatedInRangePrev, rejectedInRangePrev);

    return {
      range: { from: r.from.toISOString(), to: r.to.toISOString() },
      activeUsers: kpi(activeUsers, activeUsers),
      newSignups: kpi(newSignups, newSignupsPrev),
      validatedAssociations: kpi(validatedAssos, validatedAssosPrev),
      pendingAssociations: kpi(pendingAssos, pendingAssosPrev),
      activeMissions: kpi(activeMissions, activeMissionsPrev),
      participations: kpi(participations, participationsPrev),
      associationValidationRate: {
        value: rate,
        delta: rate - ratePrev,
        deltaPct: ratePrev === 0 ? null : ((rate - ratePrev) / ratePrev) * 100,
      },
    };
  }

  async timeseries(query: TimeseriesQueryDto): Promise<TimeseriesPoint[]> {
    const r = resolveRange(query.from, query.to);
    const trunc = query.granularity; // 'day' | 'week' | 'month'

    const tableMap: Record<string, { table: string; column: string }> = {
      user_signups: { table: 'users', column: 'created_at' },
      association_signups: { table: 'associations', column: 'created_at' },
      missions_created: { table: 'missions', column: 'created_at' },
      participations: { table: 'mission_participants', column: 'created_at' },
    };
    const conf = tableMap[query.metric];

    const rows = await this.prisma.$queryRawUnsafe<
      { bucket: Date; count: bigint }[]
    >(
      `SELECT date_trunc('${trunc}', "${conf.column}") AS bucket, COUNT(*)::bigint AS count
       FROM "${conf.table}"
       WHERE "${conf.column}" >= $1 AND "${conf.column}" <= $2
       GROUP BY bucket
       ORDER BY bucket ASC`,
      r.from,
      r.to,
    );

    return rows.map((row) => ({
      bucket: row.bucket.toISOString(),
      count: Number(row.count),
    }));
  }

  async breakdown(query: BreakdownQueryDto) {
    switch (query.dimension) {
      case 'mission_type':
        return this.prisma.mission.groupBy({
          by: ['type'],
          _count: { _all: true },
        });
      case 'mission_frequency':
        return this.prisma.mission.groupBy({
          by: ['frequency'],
          _count: { _all: true },
        });
      case 'user_status':
        return this.prisma.user.groupBy({
          by: ['status'],
          _count: { _all: true },
        });
      case 'association_status':
        return this.prisma.association.groupBy({
          by: ['status'],
          _count: { _all: true },
        });
      case 'association_category': {
        const rows = await this.prisma.association.groupBy({
          by: ['categoryId'],
          _count: { _all: true },
        });
        const cats = await this.prisma.associationCategory.findMany();
        const byId = new Map(cats.map((c) => [c.id, c.name]));
        return rows.map((r) => ({
          categoryId: r.categoryId,
          name: r.categoryId
            ? (byId.get(r.categoryId) ?? null)
            : 'Sans catégorie',
          count: r._count._all,
        }));
      }
      case 'top_causes': {
        const rows = await this.prisma.userCause.groupBy({
          by: ['causeId'],
          _count: { _all: true },
          orderBy: { _count: { causeId: 'desc' } },
          take: query.limit,
        });
        const causes = await this.prisma.cause.findMany({
          where: { id: { in: rows.map((r) => r.causeId) } },
        });
        const byId = new Map(causes.map((c) => [c.id, c.label]));
        return rows.map((r) => ({
          causeId: r.causeId,
          label: byId.get(r.causeId),
          count: r._count._all,
        }));
      }
      case 'top_skills': {
        const rows = await this.prisma.userSkill.groupBy({
          by: ['skillId'],
          _count: { _all: true },
          orderBy: { _count: { skillId: 'desc' } },
          take: query.limit,
        });
        const skills = await this.prisma.skill.findMany({
          where: { id: { in: rows.map((r) => r.skillId) } },
        });
        const byId = new Map(skills.map((s) => [s.id, s.label]));
        return rows.map((r) => ({
          skillId: r.skillId,
          label: byId.get(r.skillId),
          count: r._count._all,
        }));
      }
    }
  }

  async top(query: TopQueryDto) {
    switch (query.entity) {
      case 'associations_by_volunteers': {
        const rows = await this.prisma.associationUser.groupBy({
          by: ['associationId'],
          _count: { _all: true },
          orderBy: { _count: { associationId: 'desc' } },
          take: query.limit,
        });
        const ids = rows.map((r) => r.associationId);
        const assos = await this.prisma.association.findMany({
          where: { id: { in: ids } },
        });
        const byId = new Map(assos.map((a) => [a.id, a]));
        return rows.map((r) => ({
          associationId: r.associationId,
          name: byId.get(r.associationId)?.name,
          volunteers: r._count._all,
        }));
      }
      case 'missions_by_participants': {
        const rows = await this.prisma.missionParticipant.groupBy({
          by: ['missionId'],
          _count: { _all: true },
          orderBy: { _count: { missionId: 'desc' } },
          take: query.limit,
        });
        const ids = rows.map((r) => r.missionId);
        const missions = await this.prisma.mission.findMany({
          where: { id: { in: ids } },
          include: { association: true },
        });
        const byId = new Map(missions.map((m) => [m.id, m]));
        return rows.map((r) => ({
          missionId: r.missionId,
          title: byId.get(r.missionId)?.title,
          association: byId.get(r.missionId)?.association.name,
          participants: r._count._all,
        }));
      }
      case 'recent_users':
        return this.prisma.user.findMany({
          orderBy: { createdAt: 'desc' },
          take: query.limit,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            createdAt: true,
            status: true,
          },
        });
      case 'recent_associations':
        return this.prisma.association.findMany({
          where: { status: AssociationStatus.PENDING },
          orderBy: { createdAt: 'desc' },
          take: query.limit,
          select: {
            id: true,
            name: true,
            siret: true,
            rna: true,
            createdAt: true,
          },
        });
    }
  }

  async adminLogs(query: {
    action?: string;
    adminId?: number;
    entityType?: string;
    entityId?: number;
    from?: string;
    to?: string;
    page: number;
    limit: number;
  }) {
    const where: Record<string, unknown> = {};
    if (query.action) where.action = query.action;
    if (query.adminId) where.adminId = query.adminId;
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.from || query.to) {
      const created: Record<string, Date> = {};
      if (query.from) created.gte = new Date(query.from);
      if (query.to) created.lte = new Date(query.to);
      where.createdAt = created;
    }
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.prisma.adminLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
        include: {
          admin: { select: { email: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.adminLog.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  exportCsv(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const escape = (v: unknown) => {
      if (v === null || v === undefined) return '';
      let s: string;
      if (typeof v === 'object') s = JSON.stringify(v);
      else if (typeof v === 'string') s = v;
      else s = String(v as number | boolean | bigint);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(headers.map((h) => escape(row[h])).join(','));
    }
    return lines.join('\n');
  }
}
