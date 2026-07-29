import { Module } from '@nestjs/common';
import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Module({
  controllers: [MenuController],
  providers: [MenuService, PermissionsGuard],
  exports: [MenuService],
})
export class MenuModule {}
