import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import type { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.enableShutdownHooks();
  const configService = app.get(ConfigService);
  const trustProxyHops = configService.get<number>('TRUST_PROXY_HOPS') ?? 0;
  app.set('trust proxy', trustProxyHops);

  const normalizedPort = normalizePort(configService.get<number>('PORT'), 3000);
  const baseUrl = normalizeBaseUrl(
    configService.get<string>('API_BASE_URL'),
    normalizedPort,
  );
  const corsOrigins = parseOriginList(configService.get<string>('CORS_ORIGIN'));
  const apiOrigin = safeOriginFromUrl(baseUrl);
  const assetOrigin = safeOriginFromUrl(
    normalizeBaseUrl(
      configService.get<string>('ASSET_BASE_URL'),
      normalizedPort,
    ),
  );
  const connectOrigins = uniq(
    [apiOrigin, assetOrigin, ...corsOrigins].filter(
      (origin): origin is string => Boolean(origin),
    ),
  );

  app.use(
    helmet({
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', ...connectOrigins],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", ...connectOrigins],
          workerSrc: ["'self'", 'blob:'],
        },
      },
    }),
  );

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return callback(null, true);
      const normalized = normalizeOrigin(origin);
      if (corsOrigins.includes(normalized)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  if (configService.get<boolean>('SWAGGER_ENABLED') === true) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Node Template API')
      .setDescription('NestJS admin starter with authentication and RBAC')
      .setVersion('1.0')
      .addBearerAuth()
      .addServer(baseUrl)
      .build();
    SwaggerModule.setup(
      'api-docs',
      app,
      SwaggerModule.createDocument(app, swaggerConfig),
    );
  }

  await app.listen(normalizedPort);
}
void bootstrap();

function normalizeBaseUrl(
  value: string | undefined,
  fallbackPort: number,
): string {
  const raw = value?.trim();
  if (!raw) return `http://localhost:${fallbackPort}`;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return `http://${raw}`;
}

function normalizePort(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/$/, '');
}

function parseOriginList(raw: string | undefined): string[] {
  const value = (raw ?? '').trim();
  if (!value) return [];
  return uniq(
    value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => normalizeOrigin(s)),
  );
}

function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function safeOriginFromUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    return normalizeOrigin(u.origin);
  } catch {
    return '';
  }
}
