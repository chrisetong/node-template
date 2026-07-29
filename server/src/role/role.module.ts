import { Module } from '@nestjs/common';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { MenuModule } from '../menu/menu.module';

@Module({
  imports: [MenuModule],
  controllers: [RoleController],
  providers: [RoleService, PermissionsGuard],
  exports: [RoleService],
})
export class RoleModule {}
