import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { mkdirSync } from 'node:fs';
import { join } from 'path';
import { KeyvAdapter, type CacheManagerStore } from 'cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { Keyv } from '@keyv/redis';
import {
  utilities as nestWinstonModuleUtilities,
  WinstonModule,
} from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { MenuModule } from './menu/menu.module';
import { FileModule } from './file/file.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AssetUrlInterceptor } from './common/interceptors/asset-url.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { envValidationSchema } from './config/env.validation';
import { RoleModule } from './role/role.module';
import { DataScopeModule } from './data-scope/data-scope.module';
import { DepartmentModule } from './department/department.module';
import { AuditModule } from './audit/audit.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { SystemSettingModule } from './system-setting/system-setting.module';

const APP_TIME_ZONE = process.env.APP_TIME_ZONE?.trim() || 'Asia/Shanghai';
const NODE_ENV = (process.env.NODE_ENV ?? 'development').trim();
const ENV_FILE_PATH = NODE_ENV === 'production' ? '.env.production' : '.env';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ENV_FILE_PATH,
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),
    WinstonModule.forRootAsync({
      useFactory: () => {
        const logsDir = join(process.cwd(), 'logs');
        mkdirSync(logsDir, { recursive: true });

        const fileFormat = winston.format.combine(
          winston.format.timestamp({
            format: () => formatZonedTimestamp(APP_TIME_ZONE),
          }),
          winston.format.errors({ stack: true }),
          winston.format.json(),
        );

        return {
          transports: [
            new winston.transports.Console({
              format: winston.format.combine(
                winston.format.timestamp({
                  format: () => formatZonedTimestamp(APP_TIME_ZONE),
                }),
                winston.format.ms(),
                nestWinstonModuleUtilities.format.nestLike(
                  'Node Template API',
                  {
                    colors: true,
                    prettyPrint: false,
                  },
                ),
              ),
            }),
            new DailyRotateFile({
              dirname: logsDir,
              filename: 'application-%DATE%.log',
              datePattern: 'YYYY-MM-DD',
              maxFiles: '14d',
              maxSize: '20m',
              zippedArchive: true,
              level: 'info',
              format: fileFormat,
            }),
            new DailyRotateFile({
              dirname: logsDir,
              filename: 'error-%DATE%.log',
              datePattern: 'YYYY-MM-DD',
              maxFiles: '14d',
              maxSize: '20m',
              zippedArchive: true,
              level: 'error',
              format: fileFormat,
            }),
          ],
        };
      },
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST') ?? '127.0.0.1';
        const port = configService.get<number>('REDIS_PORT') ?? 6379;
        const password = configService.get<string>('REDIS_PASSWORD');

        const store: CacheManagerStore = (await redisStore({
          password: password?.trim() ? password.trim() : undefined,
          socket: {
            host,
            port: Number.isFinite(port) ? port : 6379,
          },
        })) as unknown as CacheManagerStore;

        const cacheNamespace =
          configService.getOrThrow<string>('CACHE_NAMESPACE');
        const keyv = new Keyv({
          store: new KeyvAdapter(store),
          namespace: cacheNamespace,
        });

        return {
          stores: [keyv],
        };
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      serveRoot: '/',
      exclude: ['/api*'],
    }),
    PrismaModule,
    DataScopeModule,
    AuthModule,
    UserModule,
    MenuModule,
    RoleModule,
    DepartmentModule,
    AuditModule,
    FileModule,
    SystemSettingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AssetUrlInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule {}

function formatZonedTimestamp(timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = formatter.formatToParts(new Date());
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return `${values.get('year')}-${values.get('month')}-${values.get('day')} ${values.get('hour')}:${values.get('minute')}:${values.get('second')}`;
}
