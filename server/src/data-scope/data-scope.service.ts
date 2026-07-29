import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataScope, Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';

type ScopeState = {
  departmentId: number | null;
  roles: {
    dataScope: DataScope;
    dataDepartments: { departmentId: number }[];
  }[];
};

export type ResolvedDataScope = {
  unrestricted: boolean;
  userId: number;
  departmentIds: number[];
  includeSelf: boolean;
};

@Injectable()
export class DataScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async userWhere(actor: AuthenticatedUser): Promise<Prisma.UserWhereInput> {
    const scope = await this.resolve(actor);
    if (scope.unrestricted) return {};
    const clauses: Prisma.UserWhereInput[] = [];
    if (scope.departmentIds.length) {
      clauses.push({ departmentId: { in: scope.departmentIds } });
    }
    if (scope.includeSelf) {
      clauses.push({ id: actor.userId });
    }
    return { OR: clauses };
  }

  /**
   * Business modules can reuse this result for rows containing departmentId
   * and/or ownerId. `unrestricted` must be checked first.
   */
  async resolve(actor: AuthenticatedUser): Promise<ResolvedDataScope> {
    if (actor.isSuper) {
      return {
        unrestricted: true,
        userId: actor.userId,
        departmentIds: [],
        includeSelf: true,
      };
    }
    const state = await this.loadState(actor);
    if (state.roles.some((role) => role.dataScope === DataScope.ALL)) {
      return {
        unrestricted: true,
        userId: actor.userId,
        departmentIds: [],
        includeSelf: true,
      };
    }
    const departmentIds = await this.collectDepartmentIds(state);
    return {
      unrestricted: false,
      userId: actor.userId,
      departmentIds,
      includeSelf:
        state.roles.some((role) => role.dataScope === DataScope.SELF) ||
        departmentIds.length === 0,
    };
  }

  async visibleDepartmentIds(
    actor: AuthenticatedUser,
  ): Promise<number[] | null> {
    if (actor.isSuper) return null;
    const state = await this.loadState(actor);
    if (state.roles.some((role) => role.dataScope === DataScope.ALL))
      return null;
    const departmentIds = await this.collectDepartmentIds(state);
    if (state.departmentId !== null) departmentIds.push(state.departmentId);
    return unique(departmentIds);
  }

  async assertCanAccessUser(actor: AuthenticatedUser, userId: number) {
    if (actor.isSuper || actor.userId === userId) return;
    const scope = await this.userWhere(actor);
    const target = await this.prisma.user.findFirst({
      where: { AND: [{ id: userId }, scope] },
      select: { id: true },
    });
    if (!target) throw new ForbiddenException('目标用户超出当前数据权限范围');
  }

  async assertCanAssignDepartment(
    actor: AuthenticatedUser,
    departmentId: number | null,
  ) {
    if (actor.isSuper) {
      await this.assertDepartmentExists(departmentId);
      return;
    }
    const scope = await this.resolve(actor);
    if (scope.unrestricted) {
      await this.assertDepartmentExists(departmentId);
      return;
    }
    if (departmentId === null || !scope.departmentIds.includes(departmentId)) {
      throw new ForbiddenException('不能分配当前账号数据范围之外的部门');
    }
    await this.assertDepartmentExists(departmentId);
  }

  private async assertDepartmentExists(departmentId: number | null) {
    if (departmentId === null) return;
    const department = await this.prisma.department.findFirst({
      where: { id: departmentId, enabled: true },
      select: { id: true },
    });
    if (!department) throw new ForbiddenException('部门不存在或已停用');
  }

  private loadState(actor: AuthenticatedUser): Promise<ScopeState> {
    return this.prisma.user
      .findUniqueOrThrow({
        where: { id: actor.userId },
        select: {
          departmentId: true,
          roles: {
            where: { role: { enabled: true } },
            select: {
              role: {
                select: {
                  dataScope: true,
                  dataDepartments: { select: { departmentId: true } },
                },
              },
            },
          },
        },
      })
      .then((user) => ({
        departmentId: user.departmentId,
        roles: user.roles.map(({ role }) => role),
      }));
  }

  private async collectDepartmentIds(state: ScopeState): Promise<number[]> {
    const result: number[] = [];
    const includeChildren = state.roles.some(
      (role) => role.dataScope === DataScope.DEPARTMENT_AND_CHILDREN,
    );
    if (
      state.departmentId !== null &&
      state.roles.some(
        (role) =>
          role.dataScope === DataScope.DEPARTMENT ||
          role.dataScope === DataScope.DEPARTMENT_AND_CHILDREN,
      )
    ) {
      result.push(state.departmentId);
      if (includeChildren) {
        result.push(...(await this.descendantIds(state.departmentId)));
      }
    }
    for (const role of state.roles) {
      if (role.dataScope === DataScope.CUSTOM) {
        result.push(
          ...role.dataDepartments.map(({ departmentId }) => departmentId),
        );
      }
    }
    return unique(result);
  }

  private async descendantIds(parentId: number): Promise<number[]> {
    const departments = await this.prisma.department.findMany({
      select: { id: true, parentId: true },
    });
    const children = new Map<number, number[]>();
    for (const department of departments) {
      if (department.parentId === null) continue;
      const values = children.get(department.parentId) ?? [];
      values.push(department.id);
      children.set(department.parentId, values);
    }
    const result: number[] = [];
    const queue = [...(children.get(parentId) ?? [])];
    const visited = new Set<number>();
    while (queue.length) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      result.push(id);
      queue.push(...(children.get(id) ?? []));
    }
    return result;
  }
}

function unique(values: number[]): number[] {
  return Array.from(new Set(values));
}
