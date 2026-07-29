import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataScope } from '@prisma/client';
import type { Cache } from 'cache-manager';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { sessionKey } from '../common/security/session';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateRoleDto } from './dto/create-role.dto';
import type { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RoleService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  list(actor: AuthenticatedUser) {
    return this.prisma.role.findMany({
      where: actor.isSuper ? {} : { isSuper: false },
      select: {
        id: true,
        code: true,
        name: true,
        enabled: true,
        isSuper: true,
        dataScope: true,
        dataDepartments: { select: { departmentId: true } },
        createdAt: true,
      },
      orderBy: [{ isSuper: 'desc' }, { id: 'asc' }],
    });
  }

  async create(actor: AuthenticatedUser, dto: CreateRoleDto) {
    this.assertSuper(actor);
    const exists = await this.prisma.role.findUnique({
      where: { code: dto.code },
    });
    if (exists) throw new ConflictException('role code already exists');
    return this.prisma.role.create({
      data: { code: dto.code, name: dto.name, isSuper: false },
      select: {
        id: true,
        code: true,
        name: true,
        enabled: true,
        isSuper: true,
        dataScope: true,
        dataDepartments: { select: { departmentId: true } },
        createdAt: true,
      },
    });
  }

  async update(actor: AuthenticatedUser, id: number, dto: UpdateRoleDto) {
    this.assertSuper(actor);
    const role = await this.prisma.role.findUnique({
      where: { id },
      select: { id: true, isSuper: true },
    });
    if (!role) throw new NotFoundException('role not found');
    if (role.isSuper) throw new ForbiddenException('超级管理员角色不可修改');
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.role.update({
        where: { id },
        data: dto,
        select: {
          id: true,
          code: true,
          name: true,
          enabled: true,
          isSuper: true,
          dataScope: true,
          dataDepartments: { select: { departmentId: true } },
          createdAt: true,
        },
      });
      await tx.user.updateMany({
        where: { roles: { some: { roleId: id } } },
        data: { tokenVersion: { increment: 1 } },
      });
      return result;
    });
    const users = await this.prisma.user.findMany({
      where: { roles: { some: { roleId: id } } },
      select: { id: true },
    });
    await Promise.all(users.map((user) => this.cache.del(sessionKey(user.id))));
    return updated;
  }

  async updateDataScope(
    actor: AuthenticatedUser,
    id: number,
    dataScope: DataScope,
    requestedDepartmentIds: number[],
  ) {
    this.assertSuper(actor);
    const role = await this.prisma.role.findUnique({
      where: { id },
      select: { id: true, isSuper: true },
    });
    if (!role) throw new NotFoundException('role not found');
    if (role.isSuper) {
      throw new ForbiddenException('超级管理员角色的数据范围不可修改');
    }
    const departmentIds =
      dataScope === DataScope.CUSTOM
        ? Array.from(new Set(requestedDepartmentIds))
        : [];
    if (dataScope === DataScope.CUSTOM && departmentIds.length === 0) {
      throw new BadRequestException('自定义数据范围至少选择一个部门');
    }
    if (departmentIds.length) {
      const count = await this.prisma.department.count({
        where: { id: { in: departmentIds }, enabled: true },
      });
      if (count !== departmentIds.length) {
        throw new BadRequestException('包含不存在或已停用的部门');
      }
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.roleDepartment.deleteMany({ where: { roleId: id } });
      if (departmentIds.length) {
        await tx.roleDepartment.createMany({
          data: departmentIds.map((departmentId) => ({
            roleId: id,
            departmentId,
          })),
        });
      }
      const result = await tx.role.update({
        where: { id },
        data: { dataScope },
        select: {
          id: true,
          code: true,
          name: true,
          enabled: true,
          isSuper: true,
          dataScope: true,
          dataDepartments: { select: { departmentId: true } },
          createdAt: true,
        },
      });
      await tx.user.updateMany({
        where: { roles: { some: { roleId: id } } },
        data: { tokenVersion: { increment: 1 } },
      });
      return result;
    });
    const users = await this.prisma.user.findMany({
      where: { roles: { some: { roleId: id } } },
      select: { id: true },
    });
    await Promise.all(users.map((user) => this.cache.del(sessionKey(user.id))));
    return updated;
  }

  private assertSuper(actor: AuthenticatedUser) {
    if (!actor.isSuper) {
      throw new ForbiddenException('仅超级管理员可以管理角色定义');
    }
  }
}
