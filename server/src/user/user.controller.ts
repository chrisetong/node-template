import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { FindUserParamDto } from './dto/find-user-param.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import type { UserDto } from './dto/user.dto';
import { UserService } from './user.service';
import { UpdateUserDepartmentDto } from './dto/update-user-department.dto';
import { Audit } from '../audit/audit.decorator';

@ApiTags('User')
@Controller('user')
@ApiBearerAuth()
export class UserController {
  constructor(private readonly users: UserService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('user:create')
  @Audit('USER_CREATE', 'user')
  create(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() dto: CreateUserDto,
  ) {
    return this.users.register(req.user, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('user:read')
  findAll(
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<UserDto[]> {
    return this.users.findAll(req.user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findById(
    @Param() params: FindUserParamDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.users.findById(req.user, params.id);
  }

  @Patch(':id/roles')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('user:update')
  @Audit('USER_ROLES_UPDATE', 'user')
  updateRoles(
    @Param() params: FindUserParamDto,
    @Body() dto: UpdateUserRoleDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.users.updateRoles(req.user, params.id, dto.roleIds);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('user:update')
  @Audit('USER_STATUS_UPDATE', 'user')
  updateStatus(
    @Param() params: FindUserParamDto,
    @Body() dto: UpdateUserStatusDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.users.updateStatus(req.user, params.id, dto.enabled);
  }

  @Patch(':id/department')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('user:update')
  @Audit('USER_DEPARTMENT_UPDATE', 'user')
  updateDepartment(
    @Param() params: FindUserParamDto,
    @Body() dto: UpdateUserDepartmentDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.users.updateDepartment(
      req.user,
      params.id,
      dto.departmentId ?? null,
    );
  }

  @Patch('profile/password')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '修改当前密码并撤销旧会话' })
  @Audit('PASSWORD_CHANGE', 'user')
  async updateMyPassword(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() dto: UpdatePasswordDto,
  ): Promise<{ ok: true }> {
    await this.users.updateMyPassword(
      req.user.userId,
      dto.oldPassword,
      dto.newPassword,
    );
    return { ok: true };
  }
}
