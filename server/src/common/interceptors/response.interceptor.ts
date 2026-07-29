import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

type ApiResponse<T> = {
  code: number;
  data: T;
  message: string;
};

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.code === 'number' &&
    'data' in record &&
    typeof record.message === 'string'
  );
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (isApiResponse(data)) return data;

        return {
          code: 200,
          data: data ?? null,
          message: 'success',
        };
      }),
    );
  }
}
