import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  type LoggerService,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import type { Request, Response } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message } = this.normalizeException(exception);

    const isExpected =
      exception instanceof HttpException ||
      exception instanceof PrismaClientKnownRequestError;
    const shouldLogStack = statusCode >= 500 || !isExpected;
    if (shouldLogStack) {
      const method = request.method;
      const url = request.originalUrl || request.url;
      const ip = request.ip || request.socket?.remoteAddress || '';

      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        `${method} ${url} ip=${ip} status=${statusCode} message=${message}`,
        stack,
        AllExceptionsFilter.name,
      );
    }

    response.status(statusCode).json({
      code: statusCode,
      data: null,
      message,
    });
  }

  private normalizeException(exception: unknown): {
    statusCode: number;
    message: string;
  } {
    if (exception instanceof PrismaClientKnownRequestError) {
      const isProd = process.env.NODE_ENV === 'production';
      if (exception.code === 'P2002') {
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'username already exists',
        };
      }

      if (!isProd) {
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: formatPrismaErrorMessage(exception),
        };
      }

      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database error',
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        return { statusCode, message: exceptionResponse };
      }

      if (exceptionResponse && typeof exceptionResponse === 'object') {
        const message = (exceptionResponse as { message?: unknown }).message;
        if (Array.isArray(message)) {
          return { statusCode, message: message.join('; ') };
        }
        if (typeof message === 'string') {
          return { statusCode, message };
        }
      }

      return { statusCode, message: exception.message };
    }

    if (exception instanceof Error) {
      const isProd = process.env.NODE_ENV === 'production';
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: isProd
          ? 'Internal server error'
          : exception.message || 'Internal server error',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }
}

function formatPrismaErrorMessage(
  error: PrismaClientKnownRequestError,
): string {
  const message = typeof error.message === 'string' ? error.message : '';
  const tableNotFound = message.match(
    /The table `([^`]+)` does not exist in the current database\./,
  );
  if (tableNotFound?.[1]) {
    return `Database error - missing table: ${tableNotFound[1]}`;
  }

  const columnNotFound = message.match(/Column `([^`]+)` does not exist/);
  if (columnNotFound?.[1]) {
    return `Database error - missing column: ${columnNotFound[1]}`;
  }

  const lines = message
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const tail = lines.slice(-2).join(' | ');
  return tail
    ? `Database error - ${error.code}: ${tail}`
    : `Database error - ${error.code}`;
}
