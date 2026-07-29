/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth/auth.service';
import { JwtStrategy } from './auth/strategies/jwt.strategy';
import { sessionKey } from './common/security/session';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { MenuService } from './menu/menu.service';
import { UserService } from './user/user.service';
import { envValidationSchema } from './config/env.validation';

class MemoryCache {
  data = new Map<string, unknown>();
  get<T>(key: string): Promise<T | undefined> {
    return Promise.resolve(this.data.get(key) as T | undefined);
  }
  set(key: string, value: unknown): Promise<void> {
    this.data.set(key, value);
    return Promise.resolve();
  }
  del(key: string): Promise<void> {
    this.data.delete(key);
    return Promise.resolve();
  }
}

const config = {
  get: (key: string) =>
    ({
      JWT_EXPIRES_IN: '2h',
      LOGIN_FAIL_LIMIT: 5,
      LOGIN_LOCK_SECONDS: 900,
      CAPTCHA_TTL_SECONDS: 300,
      PASSWORD_MIN_LENGTH: 12,
      BCRYPT_COST: 10,
      JWT_SECRET: '0123456789abcdef0123456789abcdef',
    })[key],
};

describe('security regression', () => {
  it('locks username + trusted IP after five failures without revealing account existence', async () => {
    const cache = new MemoryCache();
    const password = await bcrypt.hash('correct-password', 10);
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          username: 'alice',
          password,
          enabled: true,
          tokenVersion: 1,
          passwordVersion: 1,
          roles: [{ roleId: 1 }],
        }),
      },
    };
    const service = new AuthService(
      prisma as never,
      { signAsync: jest.fn() } as never,
      cache as never,
      config as never,
      {} as never,
    );
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const key = `captcha-${attempt}`;
      cache.data.set(`auth:captcha:${key}`, 'ABCD');
      await expect(
        service.login(
          {
            username: 'alice',
            password: 'wrong-password',
            captchaKey: key,
            captchaCode: 'abcd',
          },
          '203.0.113.8',
        ),
      ).rejects.toThrow('用户名或密码不正确');
    }
    cache.data.set('auth:captcha:locked', 'ABCD');
    await expect(
      service.login(
        {
          username: 'alice',
          password: 'correct-password',
          captchaKey: 'locked',
          captchaCode: 'ABCD',
        },
        '203.0.113.8',
      ),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('consumes captcha on first verification, including failed logins', async () => {
    const cache = new MemoryCache();
    cache.data.set('auth:captcha:once', 'WXYZ');
    const service = new AuthService(
      { user: { findUnique: jest.fn().mockResolvedValue(null) } } as never,
      {} as never,
      cache as never,
      config as never,
      {} as never,
    );
    const dto = {
      username: 'unknown',
      password: 'anything-long',
      captchaKey: 'once',
      captchaCode: 'wxyz',
    };
    await expect(service.login(dto, '127.0.0.1')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.login(dto, '127.0.0.1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('logout removes the current Redis session', async () => {
    const cache = new MemoryCache();
    cache.data.set(sessionKey(7), 'token');
    const service = new AuthService(
      {} as never,
      {} as never,
      cache as never,
      config as never,
      {} as never,
    );
    await service.logout(7);
    expect(cache.data.has(sessionKey(7))).toBe(false);
    const strategy = new JwtStrategy(
      { user: { findUnique: jest.fn() } } as never,
      cache as never,
      config as never,
    );
    const request = {
      header: jest.fn().mockReturnValue('Bearer old-token'),
    };
    await expect(
      strategy.validate(request as never, {
        sub: 7,
        username: 'alice',
        tokenVersion: 1,
        passwordVersion: 1,
        jti: 'session-id',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('password change verifies old password, forbids reuse, increments versions and revokes session', async () => {
    const cache = new MemoryCache();
    cache.data.set(sessionKey(4), 'old-token');
    const oldHash = await bcrypt.hash('old-password-123', 10);
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ password: oldHash }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const users = new UserService(
      prisma as never,
      cache as never,
      config as never,
      {} as never,
    );
    await expect(
      users.updateMyPassword(4, 'old-password-123', 'old-password-123'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await users.updateMyPassword(4, 'old-password-123', 'new-password-456');
    expect(prisma.user.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tokenVersion: { increment: 1 },
          passwordVersion: { increment: 1 },
        }),
      }),
    );
    expect(cache.data.has(sessionKey(4))).toBe(false);
  });

  it('role and user status changes revoke old sessions', async () => {
    const cache = new MemoryCache();
    cache.data.set(sessionKey(9), 'old-token');
    const role = {
      id: 2,
      code: 'USER',
      name: 'User',
      enabled: true,
      isSuper: false,
    };
    const prisma = {
      role: {
        findMany: jest.fn().mockResolvedValue([{ id: 2, isSuper: false }]),
      },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: 9, roles: [] })
          .mockResolvedValueOnce({ roles: [] }),
        update: jest.fn().mockResolvedValue({
          id: 9,
          username: 'bob',
          enabled: false,
          createdAt: new Date(),
          roles: [{ role }],
        }),
      },
      userRole: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        Promise.resolve(callback(prisma)),
      ),
    };
    const actor = {
      userId: 1,
      username: 'root',
      roles: [],
      roleIds: [1],
      isSuper: true,
      tokenVersion: 1,
      passwordVersion: 1,
    };
    const users = new UserService(
      prisma as never,
      cache as never,
      config as never,
      { assertCanAccessUser: jest.fn() } as never,
    );
    await users.updateRoles(actor, 9, [2]);
    expect(cache.data.has(sessionKey(9))).toBe(false);
    cache.data.set(sessionKey(9), 'another-token');
    await users.updateStatus(actor, 9, false);
    expect(cache.data.has(sessionKey(9))).toBe(false);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tokenVersion: { increment: 1 } }),
      }),
    );
  });

  it('rejects menu delegation outside the non-super administrator grant set', async () => {
    const prisma = {
      role: {
        findUnique: jest.fn().mockResolvedValue({ id: 2, isSuper: false }),
      },
      menu: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 10,
            name: 'A',
            path: '/a',
            component: 'A',
            icon: 'A',
            parentId: null,
            sort: 1,
            permissions: [],
          },
        ]),
      },
    };
    const menus = new MenuService(prisma as never, new MemoryCache() as never);
    const actor = {
      userId: 3,
      username: 'manager',
      roles: [],
      roleIds: [3],
      isSuper: false,
      tokenVersion: 1,
      passwordVersion: 1,
    };
    await expect(menus.setRoleMenus(actor, 2, [10, 99])).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('permissions guard fails closed when permission metadata is absent', async () => {
    const guard = new PermissionsGuard(
      { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as never,
      {} as never,
    );
    const context = { getHandler: jest.fn(), getClass: jest.fn() };
    await expect(guard.canActivate(context as never)).rejects.toThrow(
      'permission metadata missing',
    );
  });

  it('rejects unsafe production configuration and accepts a complete one', () => {
    const base = {
      NODE_ENV: 'production',
      DATABASE_URL: 'mysql://app:password@db:3306/app',
      JWT_SECRET: '0123456789abcdef0123456789abcdef',
      CORS_ORIGIN: 'https://admin.example.com',
      DEPLOYMENT_ID: 'customer-a-prod',
      CACHE_NAMESPACE: 'node-template:customer-a:prod',
      BCRYPT_COST: 12,
      PASSWORD_MIN_LENGTH: 12,
    };
    expect(
      envValidationSchema.validate({
        ...base,
        JWT_SECRET: 'replace-this-secret-with-real-value',
      }).error,
    ).toBeDefined();
    expect(
      envValidationSchema.validate({ ...base, BCRYPT_COST: 8 }).error,
    ).toBeDefined();
    expect(
      envValidationSchema.validate({ ...base, DB_TIME_ZONE: '+15:00' }).error,
    ).toBeDefined();
    expect(
      envValidationSchema.validate({
        ...base,
        CACHE_NAMESPACE: 'CHANGE_TO_UNIQUE_REDIS_PREFIX',
      }).error,
    ).toBeDefined();
    expect(
      envValidationSchema.validate({
        ...base,
        DEPLOYMENT_ID: undefined,
      }).error,
    ).toBeDefined();
    expect(envValidationSchema.validate(base).error).toBeUndefined();
  });
});
