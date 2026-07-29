import { Module } from '@nestjs/common';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { FileModule } from '../file/file.module';
import { MenuModule } from '../menu/menu.module';
import { SystemSettingController } from './system-setting.controller';
import { SystemSettingService } from './system-setting.service';

@Module({
  imports: [MenuModule, FileModule],
  controllers: [SystemSettingController],
  providers: [SystemSettingService, PermissionsGuard],
})
export class SystemSettingModule {}
