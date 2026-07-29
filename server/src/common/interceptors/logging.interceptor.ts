import {
  Inject,
  Injectable,
  type LoggerService,
  NestInterceptor,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import type { Request, Response } from 'express';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { getTrustedClientIp } from '../security/client-ip';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const startedAt = Date.now();
    const method = req.method;
    const url = req.originalUrl || req.url;
    const clientIp = getTrustedClientIp(req);
    const maskedBody = maskSensitive(req.body);

    return next.handle().pipe(
      finalize(() => {
        const durationMs = Date.now() - startedAt;
        const statusCode = res.statusCode;

        const bodyPart =
          maskedBody && Object.keys(maskedBody).length
            ? ` body=${safeJson(maskedBody)}`
            : '';

        const message = `${method} ${url} ip=${clientIp} status=${statusCode} durationMs=${durationMs}${bodyPart}`;

        if (statusCode >= 500) {
          this.logger.error(message, undefined, LoggingInterceptor.name);
          return;
        }

        if (statusCode >= 400) {
          this.logger.warn(message, LoggingInterceptor.name);
          return;
        }

        this.logger.log(message, LoggingInterceptor.name);
      }),
    );
  }
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '"[unserializable]"';
  }
}

function maskSensitive(value: unknown): unknown {
  const sensitiveKeys = new Set([
    'password',
    'pass',
    'pwd',
    'secret',
    'token',
    'accesstoken',
    'refreshtoken',
    'authorization',
    'captchakey',
    'captchacode',
  ]);

  if (!value || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((item) => maskSensitive(item));
  }

  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(input)) {
    const keyLower = key.toLowerCase();
    if (sensitiveKeys.has(keyLower)) {
      output[key] = '******';
      continue;
    }
    output[key] = maskSensitive(val);
  }
  return output;
}
