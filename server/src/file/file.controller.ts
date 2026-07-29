import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { FileService } from './file.service';
import { Audit } from '../audit/audit.decorator';

const ALLOWED_FILE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

type UploadedBinaryFile = {
  buffer: Buffer;
  mimetype: string;
};

@ApiTags('File')
@Controller('file')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @Permissions('file:upload')
  @Audit('FILE_UPLOAD', 'file')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '上传文件（返回相对路径）' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async upload(
    @UploadedFile() file?: UploadedBinaryFile,
  ): Promise<{ relativePath: string }> {
    if (!file?.buffer?.length) throw new BadRequestException('请上传文件');
    if (!ALLOWED_FILE_TYPES.has(file.mimetype)) {
      throw new BadRequestException('仅支持 JPG、PNG、WebP、GIF 和 PDF');
    }
    if (!matchesMagicBytes(file.mimetype, file.buffer)) {
      throw new BadRequestException('文件内容与声明类型不匹配');
    }
    const result = await this.fileService.saveUpload({
      mimeType: file.mimetype,
      buffer: file.buffer,
    });
    return result;
  }
}

function matchesMagicBytes(mime: string, buffer: Buffer): boolean {
  if (mime === 'image/jpeg')
    return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (mime === 'image/png')
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === 'image/gif')
    return ['GIF87a', 'GIF89a'].includes(
      buffer.subarray(0, 6).toString('ascii'),
    );
  if (mime === 'image/webp')
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  if (mime === 'application/pdf')
    return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  return false;
}
