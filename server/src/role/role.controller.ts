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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleParamDto } from './dto/role-param.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleService } from './role.service';
import { UpdateRoleDataScopeDto } from './dto/update-role-data-scope.dto';
import { Audit } from '../audit/audit.decorator';

@ApiTags('Role')
@Controller('role')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class RoleController {
  constructor(private readonly roles: RoleService) {}

  @Get()
  @Permissions('role:read')
  list(@Req() req: Request & { user: AuthenticatedUser }) {
    return this.roles.list(req.user);
  }

  @Post()
  @Permissions('role:create')
  @Audit('ROLE_CREATE', 'role')
  create(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() dto: CreateRoleDto,
  ) {
    return this.roles.create(req.user, dto);
  }

  @Patch(':id')
  @Permissions('role:update')
  @Audit('ROLE_UPDATE', 'role')
  update(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param() params: RoleParamDto,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.roles.update(req.user, params.id, dto);
  }

  @Patch(':id/data-scope')
  @Permissions('role:update')
  @Audit('ROLE_DATA_SCOPE_UPDATE', 'role')
  updateDataScope(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param() params: RoleParamDto,
    @Body() dto: UpdateRoleDataScopeDto,
  ) {
    return this.roles.updateDataScope(
      req.user,
      params.id,
      dto.dataScope,
      dto.departmentIds ?? [],
    );
  }
}
