import { Module } from '@nestjs/common';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { MenuModule } from '../menu/menu.module';
import { DepartmentController } from './department.controller';
import { DepartmentService } from './department.service';

@Module({
  imports: [MenuModule],
  controllers: [DepartmentController],
  providers: [DepartmentService, PermissionsGuard],
})
export class DepartmentModule {}
