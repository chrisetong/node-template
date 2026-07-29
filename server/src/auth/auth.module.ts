import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MenuModule } from '../menu/menu.module';

@Module({
  imports: [
    PassportModule,
    MenuModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') ?? '',
        signOptions: {
          expiresIn:
            parseDurationToSeconds(
              configService.get<string>('JWT_EXPIRES_IN'),
            ) ?? 2 * 60 * 60,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}

function parseDurationToSeconds(value?: string): number | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) {
    return Math.max(0, numeric);
  }

  const match = trimmed.match(/^(\d+)\s*([smhd])$/i);
  if (!match) return undefined;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return undefined;

  const unit = match[2].toLowerCase();
  const multiplier =
    unit === 's'
      ? 1
      : unit === 'm'
        ? 60
        : unit === 'h'
          ? 60 * 60
          : 24 * 60 * 60;

  return amount * multiplier;
}
