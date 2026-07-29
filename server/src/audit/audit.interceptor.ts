import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { finalize, Observable, tap } from 'rxjs';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { getTrustedClientIp } from '../common/security/client-ip';
import { AUDIT_METADATA, type AuditMetadata } from './audit.decorator';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.getAllAndOverride<AuditMetadata>(
      AUDIT_METADATA,
      [context.getHandler(), context.getClass()],
    );
    if (!metadata || context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const request = http.getRequest<
      Request & { user?: AuthenticatedUser; params: Record<string, string> }
    >();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();
    let success = true;
    let statusCode = response.statusCode;

    return next.handle().pipe(
      tap({
        error: (error: unknown) => {
          success = false;
          statusCode = error instanceof HttpException ? error.getStatus() : 500;
        },
      }),
      finalize(() => {
        const resourceId = paramValue(
          request.params?.id ?? request.params?.roleId,
        );
        void this.audit
          .record({
            actorId: request.user?.userId ?? null,
            actorName: request.user?.username ?? null,
            action: metadata.action,
            resource: metadata.resource,
            resourceId: resourceId?.slice(0, 80) ?? null,
            method: request.method.slice(0, 10),
            path: (request.originalUrl || request.url)
              .split('?')[0]
              .slice(0, 255),
            ip: getTrustedClientIp(request).slice(0, 64),
            userAgent:
              headerValue(request.headers['user-agent'])?.slice(0, 255) ?? null,
            statusCode: success ? response.statusCode : statusCode,
            success,
            durationMs: Math.max(0, Date.now() - startedAt),
          })
          .catch((error: unknown) => {
            this.logger.warn(
              `audit write failed: ${
                error instanceof Error ? error.message : 'unknown error'
              }`,
            );
          });
      }),
    );
  }
}

function headerValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value.join(', ');
  return value ?? null;
}

function paramValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
