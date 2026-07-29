import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { FindAuditLogDto } from './dto/find-audit-log.dto';

export type AuditRecord = {
  actorId: number | null;
  actorName: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  method: string;
  path: string;
  ip: string;
  userAgent: string | null;
  statusCode: number;
  success: boolean;
  durationMs: number;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private lastCleanupAt = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async record(record: AuditRecord) {
    const created = await this.prisma.auditLog.create({ data: record });
    this.cleanupExpiredLogs();
    return created;
  }

  async list(query: FindAuditLogDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.AuditLogWhereInput = {
      ...(query.action ? { action: { contains: query.action.trim() } } : {}),
      ...(query.success === undefined ? {} : { success: query.success }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          actorId: true,
          actorName: true,
          action: true,
          resource: true,
          resourceId: true,
          method: true,
          path: true,
          ip: true,
          userAgent: true,
          statusCode: true,
          success: true,
          durationMs: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return {
      items: items.map((item) => ({ ...item, id: item.id.toString() })),
      total,
      page,
      pageSize,
    };
  }

  private cleanupExpiredLogs() {
    const now = Date.now();
    if (now - this.lastCleanupAt < 24 * 60 * 60 * 1000) return;
    this.lastCleanupAt = now;
    const retentionDays =
      this.config.get<number>('AUDIT_RETENTION_DAYS') ?? 180;
    const cutoff = new Date(now - retentionDays * 24 * 60 * 60 * 1000);
    void this.prisma.auditLog
      .deleteMany({ where: { createdAt: { lt: cutoff } } })
      .catch((error: unknown) => {
        this.logger.warn(
          `audit cleanup failed: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      });
  }
}
