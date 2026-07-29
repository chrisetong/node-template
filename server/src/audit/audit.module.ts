import { Module } from '@nestjs/common';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { MenuModule } from '../menu/menu.module';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

@Module({
  imports: [MenuModule],
  controllers: [AuditController],
  providers: [AuditService, PermissionsGuard],
  exports: [AuditService],
})
export class AuditModule {}
