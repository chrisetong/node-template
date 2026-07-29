import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Audit } from '../audit/audit.decorator';
import { FileService } from '../file/file.service';
import { SystemSettingUploadParamDto } from './dto/system-setting-upload-param.dto';
import { UpdateSystemSettingDto } from './dto/update-system-setting.dto';
import {
  type PublicSystemSetting,
  SystemSettingService,
} from './system-setting.service';

const MAX_SYSTEM_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

type UploadedImage = {
  buffer: Buffer;
  mimetype: string;
};

@ApiTags('System Setting')
@Controller('system-setting')
export class SystemSettingController {
  constructor(
    private readonly settings: SystemSettingService,
    private readonly files: FileService,
  ) {}

  @Get('public')
  @ApiOperation({ summary: '获取公开只读视觉设置' })
  getPublic(): Promise<PublicSystemSetting> {
    return this.settings.getPublic();
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('systemSetting:read')
  @ApiBearerAuth()
  @ApiOperation({ summary: '读取系统设置' })
  getAdmin() {
    return this.settings.getAdmin();
  }

  @Patch()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('systemSetting:update')
  @Audit('SYSTEM_SETTING_UPDATE', 'systemSetting')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新系统设置单例' })
  update(@Body() dto: UpdateSystemSettingDto) {
    return this.settings.update(dto);
  }

  @Post('upload/:kind')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('systemSetting:update')
  @Audit('SYSTEM_SETTING_IMAGE_UPLOAD', 'systemSetting')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '上传系统设置专用图片' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_SYSTEM_IMAGE_BYTES, files: 1 },
    }),
  )
  async uploadImage(
    @Param() _params: SystemSettingUploadParamDto,
    @UploadedFile() file?: UploadedImage,
  ): Promise<{ relativePath: string }> {
    if (!file?.buffer?.length) throw new BadRequestException('请上传图片');
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      throw new BadRequestException('仅支持 JPG、PNG、WebP 和 GIF 图片');
    }
    if (!matchesImageMagicBytes(file.mimetype, file.buffer)) {
      throw new BadRequestException('图片内容与声明类型不匹配');
    }
    return this.files.saveSystemSettingImage({
      mimeType: file.mimetype,
      buffer: file.buffer,
    });
  }
}

export function matchesImageMagicBytes(mime: string, buffer: Buffer): boolean {
  if (mime === 'image/jpeg') {
    return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  }
  if (mime === 'image/png') {
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mime === 'image/gif') {
    return ['GIF87a', 'GIF89a'].includes(
      buffer.subarray(0, 6).toString('ascii'),
    );
  }
  if (mime === 'image/webp') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  return false;
}
