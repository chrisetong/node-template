import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { SystemSetting } from '@prisma/client';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateSystemSettingDto } from './dto/update-system-setting.dto';

const SINGLETON_ID = 1;
const SYSTEM_SETTING_CACHE_KEY = 'system-setting:public';
const SYSTEM_SETTING_CACHE_TTL_MS = 5 * 60 * 1000;
const SYSTEM_SETTING_IMAGE_PATH =
  /^\/uploads\/system-setting\/[0-9a-f-]{36}\.(?:jpg|png|webp|gif)$/i;

export type PublicSystemSetting = {
  siteName: string | null;
  loginLogoPath: string | null;
  loginDescription: string | null;
  loginBackgroundPath: string | null;
  filingText: string | null;
  filingUrl: string | null;
};

@Injectable()
export class SystemSettingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getPublic(): Promise<PublicSystemSetting> {
    const cached = await this.cache.get<PublicSystemSetting>(
      SYSTEM_SETTING_CACHE_KEY,
    );
    if (cached) return cached;

    const setting = await this.findSingleton();
    const visual = toPublicSystemSetting(setting);
    await this.cache.set(
      SYSTEM_SETTING_CACHE_KEY,
      visual,
      SYSTEM_SETTING_CACHE_TTL_MS,
    );
    return visual;
  }

  async getAdmin(): Promise<SystemSetting> {
    return this.findSingleton();
  }

  async update(dto: UpdateSystemSettingDto): Promise<SystemSetting> {
    const data = {
      ...(dto.siteName !== undefined
        ? { siteName: normalizeText(dto.siteName) }
        : {}),
      ...(dto.loginLogoPath !== undefined
        ? {
            loginLogoPath: normalizeImagePath(dto.loginLogoPath, '登录页 Logo'),
          }
        : {}),
      ...(dto.loginDescription !== undefined
        ? { loginDescription: normalizeText(dto.loginDescription) }
        : {}),
      ...(dto.loginBackgroundPath !== undefined
        ? {
            loginBackgroundPath: normalizeImagePath(
              dto.loginBackgroundPath,
              '登录背景图',
            ),
          }
        : {}),
      ...(dto.filingText !== undefined
        ? { filingText: normalizeText(dto.filingText) }
        : {}),
      ...(dto.filingUrl !== undefined
        ? { filingUrl: normalizeText(dto.filingUrl) }
        : {}),
    };

    const setting = await this.prisma.systemSetting.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...data },
      update: data,
    });
    await this.cache.del(SYSTEM_SETTING_CACHE_KEY);
    return setting;
  }

  private async findSingleton(): Promise<SystemSetting> {
    return this.prisma.systemSetting.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID },
      update: {},
    });
  }
}

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? '';
  return normalized || null;
}

function normalizeImagePath(
  value: string | null | undefined,
  label: string,
): string | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  let path = normalized.startsWith('uploads/') ? `/${normalized}` : normalized;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      path = new URL(path).pathname;
    } catch {
      throw new BadRequestException(`${label}地址无效`);
    }
  }

  if (!SYSTEM_SETTING_IMAGE_PATH.test(path)) {
    throw new BadRequestException(
      `${label}必须使用系统设置专用上传接口返回的图片`,
    );
  }
  return path;
}

function toPublicSystemSetting(setting: SystemSetting): PublicSystemSetting {
  return {
    siteName: setting.siteName,
    loginLogoPath: setting.loginLogoPath,
    loginDescription: setting.loginDescription,
    loginBackgroundPath: setting.loginBackgroundPath,
    filingText: setting.filingText,
    filingUrl: setting.filingUrl,
  };
}
