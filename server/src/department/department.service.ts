import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { DataScopeService } from '../data-scope/data-scope.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateDepartmentDto } from './dto/create-department.dto';
import type { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataScope: DataScopeService,
  ) {}

  async list(actor: AuthenticatedUser) {
    const visibleIds = await this.dataScope.visibleDepartmentIds(actor);
    return this.prisma.department.findMany({
      where: visibleIds === null ? {} : { id: { in: visibleIds } },
      select: {
        id: true,
        code: true,
        name: true,
        parentId: true,
        sort: true,
        enabled: true,
        createdAt: true,
      },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    });
  }

  async create(actor: AuthenticatedUser, dto: CreateDepartmentDto) {
    this.assertSuper(actor);
    if (dto.parentId) await this.assertParent(dto.parentId);
    const exists = await this.prisma.department.findUnique({
      where: { code: dto.code.trim().toUpperCase() },
      select: { id: true },
    });
    if (exists) throw new ConflictException('department code already exists');
    return this.prisma.department.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        parentId: dto.parentId ?? null,
        sort: dto.sort ?? 0,
      },
    });
  }

  async update(actor: AuthenticatedUser, id: number, dto: UpdateDepartmentDto) {
    this.assertSuper(actor);
    const existing = await this.prisma.department.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('department not found');
    if (dto.parentId === id) {
      throw new ForbiddenException('部门不能成为自己的上级');
    }
    if (dto.parentId) {
      await this.assertParent(dto.parentId);
      const descendants = await this.descendantIds(id);
      if (descendants.includes(dto.parentId)) {
        throw new ForbiddenException('不能把部门移动到自己的下级');
      }
    }
    return this.prisma.department.update({
      where: { id },
      data: {
        ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
        ...(dto.parentId === undefined ? {} : { parentId: dto.parentId }),
        ...(dto.sort === undefined ? {} : { sort: dto.sort }),
        ...(dto.enabled === undefined ? {} : { enabled: dto.enabled }),
      },
    });
  }

  private async assertParent(id: number) {
    const parent = await this.prisma.department.findFirst({
      where: { id, enabled: true },
      select: { id: true },
    });
    if (!parent) throw new NotFoundException('parent department not found');
  }

  private async descendantIds(id: number): Promise<number[]> {
    const departments = await this.prisma.department.findMany({
      select: { id: true, parentId: true },
    });
    const result: number[] = [];
    const queue = [id];
    while (queue.length) {
      const parentId = queue.shift()!;
      const children = departments
        .filter((department) => department.parentId === parentId)
        .map((department) => department.id);
      result.push(...children);
      queue.push(...children);
    }
    return result;
  }

  private assertSuper(actor: AuthenticatedUser) {
    if (!actor.isSuper) {
      throw new ForbiddenException('仅超级管理员可以管理部门定义');
    }
  }
}
