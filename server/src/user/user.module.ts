import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { MenuModule } from '../menu/menu.module';

@Module({
  imports: [MenuModule],
  controllers: [UserController],
  providers: [UserService, PermissionsGuard],
})
export class UserModule {}
