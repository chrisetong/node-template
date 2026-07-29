import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateMenuDto } from './dto/create-menu.dto';
import { RoleParamDto } from './dto/role-param.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { UpdateRoleMenusDto } from './dto/update-role-menus.dto';
import { MenuService, type MenuNode } from './menu.service';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Audit } from '../audit/audit.decorator';

@ApiTags('Menu')
@Controller('menu')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get('tree')
  @Permissions('menu:read')
  @ApiOperation({ summary: '获取菜单树（全量，用于管理端）' })
  getTreeAll(
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<MenuNode[]> {
    return this.menuService.getGrantableTree(req.user);
  }

  @Get()
  @Permissions('menu:read')
  @ApiOperation({ summary: '获取菜单列表（全量，用于管理端）' })
  listAll() {
    return this.menuService.listAll();
  }

  @Get('components/views')
  @Permissions('menu:read')
  @ApiOperation({ summary: '扫描并返回前端 views 组件路径列表' })
  listViewComponents(): Promise<{ components: string[] }> {
    return this.menuService
      .listViewComponents()
      .then((components) => ({ components }));
  }

  @Post()
  @Permissions('menu:create')
  @Audit('MENU_CREATE', 'menu')
  @ApiOperation({ summary: '创建菜单' })
  create(
    @Body() dto: CreateMenuDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.menuService.createMenu(req.user, {
      name: dto.name,
      path: dto.path,
      component: dto.component,
      icon: dto.icon,
      parentId: dto.parentId ?? null,
      sort: dto.sort ?? 0,
      permissions: Array.isArray(dto.permissions) ? dto.permissions : [],
    });
  }

  @Patch(':id')
  @Permissions('menu:update')
  @Audit('MENU_UPDATE', 'menu')
  @ApiOperation({ summary: '更新菜单' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMenuDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.menuService.updateMenu(req.user, id, {
      name: dto.name,
      path: dto.path,
      component: dto.component,
      icon: dto.icon,
      parentId: dto.parentId,
      sort: dto.sort,
      permissions: Array.isArray(dto.permissions) ? dto.permissions : undefined,
    });
  }

  @Delete(':id')
  @Permissions('menu:delete')
  @Audit('MENU_DELETE', 'menu')
  @ApiOperation({ summary: '删除菜单' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<{ ok: true }> {
    await this.menuService.deleteMenu(req.user, id);
    return { ok: true };
  }

  @Get('roles/:roleId')
  @Permissions('roleMenu:read')
  @ApiOperation({ summary: '获取角色绑定的菜单 ID 列表' })
  getRoleMenus(@Param() params: RoleParamDto): Promise<{ menuIds: number[] }> {
    return this.menuService
      .getMenuIdsByRole(params.roleId)
      .then((menuIds) => ({ menuIds }));
  }

  @Patch('roles/:roleId')
  @Permissions('roleMenu:update')
  @Audit('ROLE_MENUS_UPDATE', 'role')
  @ApiOperation({ summary: '更新角色绑定的菜单' })
  async updateRoleMenus(
    @Param() params: RoleParamDto,
    @Body() dto: UpdateRoleMenusDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<{ ok: true }> {
    await this.menuService.setRoleMenus(
      req.user,
      params.roleId,
      dto.menuIds ?? [],
    );
    return { ok: true };
  }
}
