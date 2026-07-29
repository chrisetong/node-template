import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Inject,
  Injectable,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Cache } from 'cache-manager';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'node:crypto';
import * as svgCaptcha from 'svg-captcha';
import { PrismaService } from '../prisma/prisma.service';
import type { UserDto } from '../user/dto/user.dto';
import { LoginDto } from './dto/login.dto';
import { MenuService, type MenuNode } from '../menu/menu.service';
import { sessionKey } from '../common/security/session';

type LoginFailState = { count: number; lockedUntil?: number };
type JwtPayload = {
  sub: number;
  username: string;
  tokenVersion: number;
  passwordVersion: number;
  jti: string;
};

@Injectable()
export class AuthService {
  private readonly dummyPasswordHash: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly config: ConfigService,
    private readonly menuService: MenuService,
  ) {
    this.dummyPasswordHash = bcrypt.hash(
      randomUUID(),
      this.config.get<number>('BCRYPT_COST') ?? 12,
    );
  }

  async login(
    dto: LoginDto,
    clientIp: string,
  ): Promise<{ accessToken: string }> {
    await this.verifyCaptcha(dto.captchaKey, dto.captchaCode);
    const failKey = this.loginFailKey(dto.username, clientIp);
    await this.assertNotLocked(failKey);

    const user = await this.prisma.user.findUnique({
      where: { username: dto.username.trim() },
      select: {
        id: true,
        username: true,
        password: true,
        enabled: true,
        tokenVersion: true,
        passwordVersion: true,
        roles: { where: { role: { enabled: true } }, select: { roleId: true } },
      },
    });

    // Always perform bcrypt verification so unknown and disabled accounts follow
    // the same externally observable failure path.
    const passwordOk = await bcrypt.compare(
      dto.password,
      user?.password ?? (await this.dummyPasswordHash),
    );
    if (!user || !user.enabled || !passwordOk || user.roles.length === 0) {
      await this.recordLoginFailure(failKey);
      throw new UnauthorizedException('用户名或密码不正确');
    }

    await this.cache.del(failKey);
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      tokenVersion: user.tokenVersion,
      passwordVersion: user.passwordVersion,
      jti: randomUUID(),
    };
    const accessToken = await this.jwtService.signAsync(payload);
    await this.cache.set(
      sessionKey(user.id),
      accessToken,
      durationToMs(
        this.config.get<string>('JWT_EXPIRES_IN'),
        2 * 60 * 60 * 1000,
      ),
    );
    return { accessToken };
  }

  async createCaptcha(): Promise<{ key: string; svg: string }> {
    const captcha = svgCaptcha.create({
      size: 4,
      ignoreChars: '0o1il',
      noise: 2,
      color: false,
      background: '#ffffff',
    });
    const key = randomUUID();
    const ttl = this.config.get<number>('CAPTCHA_TTL_SECONDS') ?? 300;
    await this.cache.set(`auth:captcha:${key}`, captcha.text, ttl * 1000);
    return { key, svg: captcha.data };
  }

  async logout(userId: number): Promise<void> {
    await this.cache.del(sessionKey(userId));
  }

  async getCurrentUser(userId: number): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        enabled: true,
        createdAt: true,
        department: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        roles: {
          select: {
            role: {
              select: {
                id: true,
                code: true,
                name: true,
                enabled: true,
                isSuper: true,
              },
            },
          },
        },
      },
    });
    if (!user?.enabled) throw new UnauthorizedException('invalid token');
    return {
      id: user.id,
      username: user.username,
      enabled: user.enabled,
      createdAt: user.createdAt,
      department: user.department,
      roles: user.roles.map(({ role }) => role),
    };
  }

  async getCurrentUserWithPermissions(userId: number): Promise<{
    user: UserDto;
    menuTree: MenuNode[];
    permissions: string[];
  }> {
    const user = await this.getCurrentUser(userId);
    const roleIds = user.roles.filter((r) => r.enabled).map((r) => r.id);
    const [menuTree, permissions] = await Promise.all([
      this.menuService.getMenuTreeByRoleIds(roleIds),
      this.menuService.getPermissionIdentifiersByRoleIds(roleIds),
    ]);
    return { user, menuTree, permissions };
  }

  private async verifyCaptcha(key: string, input: string) {
    const cacheKey = `auth:captcha:${key}`;
    const expected = await this.cache.get<string>(cacheKey);
    await this.cache.del(cacheKey);
    if (
      !expected ||
      expected.trim().toLowerCase() !== (input ?? '').trim().toLowerCase()
    ) {
      throw new BadRequestException('验证码错误或已失效');
    }
  }

  private loginFailKey(username: string, ip: string): string {
    const identity = createHash('sha256')
      .update(`${username.trim().toLowerCase()}\0${ip}`)
      .digest('hex');
    return `auth:login-fail:${identity}`;
  }

  private async assertNotLocked(key: string) {
    const state = await this.cache.get<LoginFailState>(key);
    if (state?.lockedUntil && state.lockedUntil > Date.now()) {
      throw new HttpException(
        '登录失败次数过多，请稍后再试',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async recordLoginFailure(key: string) {
    const limit = this.config.get<number>('LOGIN_FAIL_LIMIT') ?? 5;
    const lockSeconds = this.config.get<number>('LOGIN_LOCK_SECONDS') ?? 900;
    const existing = await this.cache.get<LoginFailState>(key);
    const count = (existing?.count ?? 0) + 1;
    const state: LoginFailState = {
      count,
      ...(count >= limit
        ? { lockedUntil: Date.now() + lockSeconds * 1000 }
        : {}),
    };
    await this.cache.set(key, state, lockSeconds * 1000);
  }
}

function durationToMs(value: string | undefined, fallback: number): number {
  const match = value?.trim().match(/^(\d+)\s*([smhd])$/i);
  if (!match) return fallback;
  const amount = Number(match[1]);
  const units: Record<string, number> = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000,
  };
  return amount * units[match[2].toLowerCase()];
}
