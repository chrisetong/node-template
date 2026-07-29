import { Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

@Injectable()
export class FileService {
  async saveUpload(input: {
    mimeType: string;
    buffer: Buffer;
  }): Promise<{ relativePath: string }> {
    return this.saveToUploadDirectory(input);
  }

  async saveSystemSettingImage(input: {
    mimeType: string;
    buffer: Buffer;
  }): Promise<{ relativePath: string }> {
    return this.saveToUploadDirectory(input, 'system-setting');
  }

  private async saveToUploadDirectory(
    input: { mimeType: string; buffer: Buffer },
    childDirectory?: 'system-setting',
  ): Promise<{ relativePath: string }> {
    const ext = extensionForMime(input.mimeType);
    const name = `${randomUUID()}${ext}`;
    const dir = join(
      process.cwd(),
      'public',
      'uploads',
      ...(childDirectory ? [childDirectory] : []),
    );
    await mkdir(dir, { recursive: true });
    const absolutePath = join(dir, name);
    await writeFile(absolutePath, input.buffer);
    const relativeDirectory = childDirectory
      ? `/uploads/${childDirectory}`
      : '/uploads';
    return { relativePath: `${relativeDirectory}/${name}` };
  }
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
