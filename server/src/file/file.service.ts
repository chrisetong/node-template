import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

type UploadDirectory = 'general' | 'system-setting';

@Injectable()
export class FileService {
  constructor(private readonly config: ConfigService) {}

  async saveUpload(input: {
    mimeType: string;
    buffer: Buffer;
  }): Promise<{ relativePath: string }> {
    return this.saveToUploadDirectory(input, 'general');
  }

  async saveSystemSettingImage(input: {
    mimeType: string;
    buffer: Buffer;
  }): Promise<{ relativePath: string }> {
    return this.saveToUploadDirectory(input, 'system-setting');
  }

  private async saveToUploadDirectory(
    input: { mimeType: string; buffer: Buffer },
    childDirectory: UploadDirectory,
  ): Promise<{ relativePath: string }> {
    const ext = extensionForMime(input.mimeType);
    const name = `${randomUUID()}${ext}`;
    const uploadDate = formatUploadDate(
      new Date(),
      this.config.get<string>('APP_TIME_ZONE') ?? 'Asia/Shanghai',
    );
    const dir = join(
      process.cwd(),
      'public',
      'uploads',
      childDirectory,
      uploadDate,
    );
    await mkdir(dir, { recursive: true });
    const absolutePath = join(dir, name);
    await writeFile(absolutePath, input.buffer);
    return {
      relativePath: `/uploads/${childDirectory}/${uploadDate}/${name}`,
    };
  }
}

export function formatUploadDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function extensionForMime(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'application/pdf': '.pdf',
  };
  return extensions[mimeType] ?? '';
}
