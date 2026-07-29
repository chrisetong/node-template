import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
export class AssetUrlInterceptor implements NestInterceptor {
  constructor(private readonly configService: ConfigService) {}

  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const baseUrl = normalizeBaseUrl(
      this.configService.get<string>('ASSET_BASE_URL') ??
        this.configService.get<string>('API_BASE_URL'),
    );

    return next.handle().pipe(
      map((payload: unknown) => {
        if (!baseUrl) return payload;
        if (!isApiResponse(payload)) return payload;
        return {
          ...payload,
          data: expandAssetUrls(payload.data, baseUrl),
        };
      }),
    );
  }
}

function normalizeBaseUrl(value: string | undefined): string {
  const raw = value?.trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return `http://${raw}`;
}

const ASSET_KEYS = new Set([
  'image',
  'avatar',
  'cover',
  'thumbnail',
  'banner',
  'logo',
]);

function shouldExpandAssetKey(key: string): boolean {
  if (key === 'relativePath') return false;
  if (key.endsWith('Url')) return false;
  if (key.endsWith('Path')) return true;
  return ASSET_KEYS.has(key);
}

function isRelativeAssetPath(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://'))
    return false;
  if (trimmed.startsWith('data:')) return false;
  return trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/');
}

function joinBaseUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function expandAssetUrls(value: unknown, baseUrl: string): unknown {
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    if (isRelativeAssetPath(value)) return joinBaseUrl(baseUrl, value);
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => expandAssetUrls(item, baseUrl));
  }
  if (!value || typeof value !== 'object') return value;

  const record = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(record)) {
    if (
      typeof v === 'string' &&
      shouldExpandAssetKey(k) &&
      isRelativeAssetPath(v)
    ) {
      next[k] = joinBaseUrl(baseUrl, v);
      continue;
    }
    next[k] = expandAssetUrls(v, baseUrl);
  }
  return next;
}
