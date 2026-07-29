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
import { Audit } from '../audit/audit.decorator';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { DepartmentParamDto } from './dto/department-param.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@ApiTags('Department')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('department')
export class DepartmentController {
  constructor(private readonly departments: DepartmentService) {}

  @Get()
  @Permissions('department:read')
  list(@Req() req: Request & { user: AuthenticatedUser }) {
    return this.departments.list(req.user);
  }

  @Post()
  @Permissions('department:create')
  @Audit('DEPARTMENT_CREATE', 'department')
  create(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() dto: CreateDepartmentDto,
  ) {
    return this.departments.create(req.user, dto);
  }

  @Patch(':id')
  @Permissions('department:update')
  @Audit('DEPARTMENT_UPDATE', 'department')
  update(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param() params: DepartmentParamDto,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departments.update(req.user, params.id, dto);
  }
}
