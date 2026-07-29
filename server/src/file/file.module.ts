import { Module } from '@nestjs/common';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { MenuModule } from '../menu/menu.module';

@Module({
  imports: [MenuModule],
  controllers: [FileController],
  providers: [FileService, PermissionsGuard],
  exports: [FileService],
})
export class FileModule {}
