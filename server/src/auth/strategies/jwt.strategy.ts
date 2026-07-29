import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Cache } from 'cache-manager';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { sessionKey } from '../../common/security/session';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

type JwtPayload = {
  sub: number;
  username: string;
  tokenVersion: number;
  passwordVersion: number;
  jti: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? '',
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: JwtPayload,
  ): Promise<AuthenticatedUser> {
    const token = extractBearerToken(req);
    const expected = await this.cache.get<string>(sessionKey(payload.sub));
    if (!token || !expected || expected !== token) {
      throw new UnauthorizedException('invalid token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        username: true,
        enabled: true,
        tokenVersion: true,
        passwordVersion: true,
        roles: {
          where: { role: { enabled: true } },
          select: {
            role: {
              select: { id: true, code: true, name: true, isSuper: true },
            },
          },
        },
      },
    });
    if (
      !user?.enabled ||
      user.tokenVersion !== payload.tokenVersion ||
      user.passwordVersion !== payload.passwordVersion ||
      user.roles.length === 0
    ) {
      throw new UnauthorizedException('invalid token');
    }
    const roles = user.roles.map(({ role }) => role);
    return {
      userId: user.id,
      username: user.username,
      roles,
      roleIds: roles.map((role) => role.id),
      isSuper: roles.some((role) => role.isSuper),
      tokenVersion: user.tokenVersion,
      passwordVersion: user.passwordVersion,
    };
  }
}

function extractBearerToken(req: Request): string {
  const header = req.header('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}
