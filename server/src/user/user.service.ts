import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { sessionKey } from '../common/security/session';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UserDto } from './dto/user.dto';
import { DataScopeService } from '../data-scope/data-scope.service';

const userSelect = {
  id: true,
  username: true,
  enabled: true,
  createdAt: true,
  department: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  roles: {
    select: {
      role: {
        select: {
          id: true,
          code: true,
          name: true,
          enabled: true,
          isSuper: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly config: ConfigService,
    private readonly dataScope: DataScopeService,
  ) {}

  async register(
    actor: AuthenticatedUser,
    dto: CreateUserDto,
  ): Promise<UserDto> {
    const existing = await this.prisma.user.findUnique({
      where: { username: dto.username.trim() },
      select: { id: true },
    });
    if (existing) throw new ConflictException('username already exists');
    const roleIds = await this.validateAssignableRoles(
      actor,
      dto.roleIds ?? [],
    );
    const departmentId = dto.departmentId ?? null;
    await this.dataScope.assertCanAssignDepartment(actor, departmentId);
    const password = await this.hashPassword(dto.password);
    const created = await this.prisma.user.create({
      data: {
        username: dto.username.trim(),
        password,
        departmentId,
        roles: { createMany: { data: roleIds.map((roleId) => ({ roleId })) } },
      },
      select: userSelect,
    });
    return mapUser(created);
  }

  async findAll(actor: AuthenticatedUser): Promise<UserDto[]> {
    const where = await this.dataScope.userWhere(actor);
    const users = await this.prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: { id: 'desc' },
    });
    return users.map(mapUser);
  }

  async findById(actor: AuthenticatedUser, id: number): Promise<UserDto> {
    await this.dataScope.assertCanAccessUser(actor, id);
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
    if (!user) throw new NotFoundException('user not found');
    return mapUser(user);
  }

  async updateRoles(
    actor: AuthenticatedUser,
    id: number,
    requestedRoleIds: number[],
  ): Promise<UserDto> {
    if (actor.userId === id) throw new ForbiddenException('不能修改自己的角色');
    await this.dataScope.assertCanAccessUser(actor, id);
    const target = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        roles: { select: { role: { select: { isSuper: true } } } },
      },
    });
    if (!target) throw new NotFoundException('user not found');
    if (!actor.isSuper && target.roles.some(({ role }) => role.isSuper)) {
      throw new ForbiddenException('不能修改超级管理员');
    }
    const roleIds = await this.validateAssignableRoles(actor, requestedRoleIds);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId: id, roleId })),
      });
      return tx.user.update({
        where: { id },
        data: { tokenVersion: { increment: 1 } },
        select: userSelect,
      });
    });
    await this.cache.del(sessionKey(id));
    return mapUser(updated);
  }

  async updateStatus(
    actor: AuthenticatedUser,
    id: number,
    enabled: boolean,
  ): Promise<UserDto> {
    if (actor.userId === id) throw new ForbiddenException('不能禁用自己的账号');
    await this.dataScope.assertCanAccessUser(actor, id);
    const target = await this.prisma.user.findUnique({
      where: { id },
      select: { roles: { select: { role: { select: { isSuper: true } } } } },
    });
    if (!target) throw new NotFoundException('user not found');
    if (!actor.isSuper && target.roles.some(({ role }) => role.isSuper)) {
      throw new ForbiddenException('不能修改超级管理员');
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { enabled, tokenVersion: { increment: 1 } },
      select: userSelect,
    });
    await this.cache.del(sessionKey(id));
    return mapUser(updated);
  }

  async updateDepartment(
    actor: AuthenticatedUser,
    id: number,
    departmentId: number | null,
  ): Promise<UserDto> {
    if (actor.userId === id) {
      throw new ForbiddenException('不能修改自己的所属部门');
    }
    await this.dataScope.assertCanAccessUser(actor, id);
    await this.dataScope.assertCanAssignDepartment(actor, departmentId);
    const target = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        roles: { select: { role: { select: { isSuper: true } } } },
      },
    });
    if (!target) throw new NotFoundException('user not found');
    if (!actor.isSuper && target.roles.some(({ role }) => role.isSuper)) {
      throw new ForbiddenException('不能修改超级管理员');
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { departmentId, tokenVersion: { increment: 1 } },
      select: userSelect,
    });
    await this.cache.del(sessionKey(id));
    return mapUser(updated);
  }

  async updateMyPassword(
    userId: number,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });
    if (!user) throw new NotFoundException('user not found');
    if (!(await bcrypt.compare(oldPassword, user.password))) {
      throw new ForbiddenException('原密码不正确');
    }
    if (await bcrypt.compare(newPassword, user.password)) {
      throw new BadRequestException('新密码不能与原密码相同');
    }
    const password = await this.hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password,
        passwordVersion: { increment: 1 },
        tokenVersion: { increment: 1 },
      },
    });
    await this.cache.del(sessionKey(userId));
  }

  private async hashPassword(password: string) {
    const minLength = this.config.get<number>('PASSWORD_MIN_LENGTH') ?? 12;
    if (password.length < minLength) {
      throw new BadRequestException(`密码长度至少为 ${minLength} 位`);
    }
    const cost = this.config.get<number>('BCRYPT_COST') ?? 12;
    return bcrypt.hash(password, cost);
  }

  private async validateAssignableRoles(
    actor: AuthenticatedUser,
    roleIds: number[],
  ) {
    const unique = Array.from(new Set(roleIds));
    if (!unique.length) throw new BadRequestException('至少选择一个角色');
    const roles = await this.prisma.role.findMany({
      where: { id: { in: unique }, enabled: true },
      select: { id: true, isSuper: true },
    });
    if (roles.length !== unique.length)
      throw new BadRequestException('包含无效或已停用角色');
    if (!actor.isSuper) {
      const actorRoleIds = new Set(actor.roleIds);
      if (roles.some((role) => role.isSuper || !actorRoleIds.has(role.id))) {
        throw new ForbiddenException('不能转授当前账号未拥有的角色');
      }
    }
    return unique;
  }
}

function mapUser(user: {
  id: number;
  username: string;
  enabled: boolean;
  createdAt: Date;
  department: { id: number; code: string; name: string } | null;
  roles: { role: UserDto['roles'][number] }[];
}): UserDto {
  return { ...user, roles: user.roles.map(({ role }) => role) };
}
