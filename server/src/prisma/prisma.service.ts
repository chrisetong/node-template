import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get<string>('DATABASE_URL'),
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
    const timeZone = this.configService.get<string>('DB_TIME_ZONE') ?? '+08:00';
    await this.$executeRawUnsafe(`SET time_zone = '${timeZone}'`);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
