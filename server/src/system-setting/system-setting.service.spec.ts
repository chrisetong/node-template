import { BadRequestException } from '@nestjs/common';
import type { SystemSetting } from '@prisma/client';
import { SystemSettingService } from './system-setting.service';

const singleton: SystemSetting = {
  id: 1,
  siteName: 'Example',
  loginLogoPath:
    '/uploads/system-setting/123e4567-e89b-12d3-a456-426614174000.png',
  loginDescription: null,
  loginBackgroundPath: null,
  filingText: null,
  filingUrl: null,
  createdAt: new Date('2026-07-29T00:00:00Z'),
  updatedAt: new Date('2026-07-29T00:00:00Z'),
};

describe('SystemSettingService', () => {
  it('caches the public singleton without exposing internal timestamps', async () => {
    const prisma = {
      systemSetting: { upsert: jest.fn().mockResolvedValue(singleton) },
    };
    const cache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };
    const service = new SystemSettingService(prisma as never, cache as never);

    await expect(service.getPublic()).resolves.toEqual({
      siteName: 'Example',
      loginLogoPath:
        '/uploads/system-setting/123e4567-e89b-12d3-a456-426614174000.png',
      loginDescription: null,
      loginBackgroundPath: null,
      filingText: null,
      filingUrl: null,
    });
    expect(cache.set).toHaveBeenCalledWith(
      'system-setting:public',
      expect.objectContaining({ siteName: 'Example' }),
      300_000,
    );
  });

  it('normalizes empty values and invalidates the namespaced cache key', async () => {
    const prisma = {
      systemSetting: {
        upsert: jest
          .fn()
          .mockImplementation(({ create, update }) =>
            Promise.resolve({ ...singleton, ...create, ...update }),
          ),
      },
    };
    const cache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn().mockResolvedValue(undefined),
    };
    const service = new SystemSettingService(prisma as never, cache as never);

    const updated = await service.update({
      siteName: '  ',
      loginLogoPath:
        'https://assets.example.com/uploads/system-setting/123e4567-e89b-12d3-a456-426614174000.png',
    });

    expect(updated.siteName).toBeNull();
    expect(updated.loginLogoPath).toBe(
      '/uploads/system-setting/123e4567-e89b-12d3-a456-426614174000.png',
    );
    expect(cache.del).toHaveBeenCalledWith('system-setting:public');
  });

  it('rejects images outside the dedicated system-setting upload directory', async () => {
    const service = new SystemSettingService(
      { systemSetting: { upsert: jest.fn() } } as never,
      { del: jest.fn() } as never,
    );

    await expect(
      service.update({ loginLogoPath: '/uploads/general.png' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
