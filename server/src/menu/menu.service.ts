import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { sessionKey } from '../common/security/session';

export type MenuNode = {
  id: number;
  name: string;
  path: string;
  component: string;
  icon: string;
  sort: number;
  children: MenuNode[];
};

type MenuRow = {
  id: number;
  name: string;
  path: string;
  component: string;
  icon: string;
  parentId: number | null;
  sort: number;
  permissions: unknown;
};

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getMenuTreeByRoleIds(roleIds: number[]): Promise<MenuNode[]> {
    const menus = await this.getMenusByRolesIncludingAncestors(roleIds);
    return buildMenuTree(menus);
  }

  async getPermissionIdentifiersByRoleIds(
    roleIds: number[],
  ): Promise<string[]> {
    const menus = await this.getMenusByRolesIncludingAncestors(roleIds);
    const routePermissions = menus
      .filter((m) => Boolean(m.component) && Boolean(m.path))
      .map((m) => `route:${m.path}`);

    const actionPermissions = menus.flatMap((m) => {
      if (!m.permissions) return [];
      if (Array.isArray(m.permissions)) {
        return m.permissions.filter((p): p is string => typeof p === 'string');
      }
      return [];
    });

    return Array.from(new Set([...routePermissions, ...actionPermissions]));
  }

  private async getMenusByRolesIncludingAncestors(
    roleIds: number[],
  ): Promise<MenuRow[]> {
    if (!roleIds.length) return [];
    const direct: MenuRow[] = await this.prisma.menu.findMany({
      where: {
        roles: { some: { roleId: { in: roleIds }, role: { enabled: true } } },
      },
      select: {
        id: true,
        name: true,
        path: true,
        component: true,
        icon: true,
        parentId: true,
        sort: true,
        permissions: true,
      },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    });

    const byId = new Map<number, MenuRow>(direct.map((m) => [m.id, m]));
    const queue: number[] = direct
      .map((m) => m.parentId)
      .filter((id): id is number => typeof id === 'number' && !byId.has(id));

    while (queue.length) {
      const batch = Array.from(new Set(queue.splice(0, 50)));
      const parents: MenuRow[] = await this.prisma.menu.findMany({
        where: { id: { in: batch } },
        select: {
          id: true,
          name: true,
          path: true,
          component: true,
          icon: true,
          parentId: true,
          sort: true,
          permissions: true,
        },
      });

      for (const p of parents) {
        if (!byId.has(p.id)) {
          byId.set(p.id, p);
          if (typeof p.parentId === 'number' && !byId.has(p.parentId)) {
            queue.push(p.parentId);
          }
        }
      }
    }

    return Array.from(byId.values()).sort(
      (a, b) => a.sort - b.sort || a.id - b.id,
    );
  }

  async listAll(): Promise<MenuRow[]> {
    return this.prisma.menu.findMany({
      select: {
        id: true,
        name: true,
        path: true,
        component: true,
        icon: true,
        parentId: true,
        sort: true,
        permissions: true,
      },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    });
  }

  async getTreeAll(): Promise<MenuNode[]> {
    const rows = await this.listAll();
    return buildMenuTree(rows);
  }

  async getGrantableTree(actor: AuthenticatedUser): Promise<MenuNode[]> {
    return actor.isSuper
      ? this.getTreeAll()
      : this.getMenuTreeByRoleIds(actor.roleIds);
  }

  async createMenu(
    actor: AuthenticatedUser,
    input: {
      name: string;
      path: string;
      component: string;
      icon: string;
      parentId?: number | null;
      sort?: number;
      permissions?: string[];
    },
  ): Promise<MenuRow> {
    this.assertSuper(actor);
    return this.prisma.$transaction(async (tx) => {
      const menu = await tx.menu.create({
        data: {
          name: input.name,
          path: input.path,
          component: input.component,
          icon: input.icon,
          parentId: input.parentId ?? null,
          sort: input.sort ?? 0,
          permissions: input.permissions ?? [],
        },
        select: {
          id: true,
          name: true,
          path: true,
          component: true,
          icon: true,
          parentId: true,
          sort: true,
          permissions: true,
        },
      });
      const superRoles = await tx.role.findMany({
        where: { isSuper: true, enabled: true },
        select: { id: true },
      });
      if (superRoles.length) {
        await tx.roleMenu.createMany({
          data: superRoles.map((role) => ({
            roleId: role.id,
            menuId: menu.id,
          })),
          skipDuplicates: true,
        });
      }
      return menu;
    });
  }

  async updateMenu(
    actor: AuthenticatedUser,
    id: number,
    input: Partial<{
      name: string;
      path: string;
      component: string;
      icon: string;
      parentId: number | null;
      sort: number;
      permissions: string[];
    }>,
  ): Promise<MenuRow> {
    this.assertSuper(actor);
    return this.prisma.menu.update({
      where: { id },
      data: {
        ...(typeof input.name === 'string' ? { name: input.name } : {}),
        ...(typeof input.path === 'string' ? { path: input.path } : {}),
        ...(typeof input.component === 'string'
          ? { component: input.component }
          : {}),
        ...(typeof input.icon === 'string' ? { icon: input.icon } : {}),
        ...(typeof input.sort === 'number' ? { sort: input.sort } : {}),
        ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
        ...(Array.isArray(input.permissions)
          ? { permissions: input.permissions }
          : {}),
      },
      select: {
        id: true,
        name: true,
        path: true,
        component: true,
        icon: true,
        parentId: true,
        sort: true,
        permissions: true,
      },
    });
  }

  async deleteMenu(actor: AuthenticatedUser, id: number): Promise<void> {
    this.assertSuper(actor);
    const menu = await this.prisma.menu.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!menu) {
      throw new NotFoundException('菜单不存在');
    }

    const [childrenCount, roleBindingCount] = await Promise.all([
      this.prisma.menu.count({ where: { parentId: id } }),
      this.prisma.roleMenu.count({ where: { menuId: id } }),
    ]);

    if (childrenCount > 0) {
      throw new BadRequestException('该菜单下存在子菜单，禁止删除');
    }
    if (roleBindingCount > 0) {
      throw new BadRequestException('该菜单已关联角色，请先解绑角色后再删除');
    }

    await this.prisma.menu.delete({ where: { id } });
  }

  async listViewComponents(): Promise<string[]> {
    const viewsDir = await resolveViewsDirectory();
    const results = await walkVueFiles(viewsDir);
    return results.sort((a, b) => a.localeCompare(b));
  }

  async getMenuIdsByRole(roleId: number): Promise<number[]> {
    const rows = await this.prisma.roleMenu.findMany({
      where: { roleId },
      select: { menuId: true },
    });
    return rows.map((r) => r.menuId);
  }

  async setRoleMenus(
    actor: AuthenticatedUser,
    roleId: number,
    menuIds: number[],
  ): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, isSuper: true },
    });
    if (!role) throw new NotFoundException('role not found');
    if (role.isSuper && !actor.isSuper) {
      throw new ForbiddenException('超级管理员角色不可修改');
    }
    const unique = Array.from(new Set(menuIds)).filter((id) =>
      Number.isInteger(id),
    );
    if (!actor.isSuper) {
      const owned = new Set(
        (await this.getMenusByRolesIncludingAncestors(actor.roleIds)).map(
          (m) => m.id,
        ),
      );
      if (unique.some((id) => !owned.has(id))) {
        throw new ForbiddenException('不能转授当前账号未拥有的权限');
      }
    }
    const existingCount = await this.prisma.menu.count({
      where: { id: { in: unique } },
    });
    if (existingCount !== unique.length)
      throw new BadRequestException('menuIds contains invalid menu');

    await this.prisma.$transaction([
      this.prisma.roleMenu.deleteMany({ where: { roleId } }),
      unique.length
        ? this.prisma.roleMenu.createMany({
            data: unique.map((menuId) => ({ roleId, menuId })),
          })
        : this.prisma.roleMenu.createMany({ data: [] }),
      this.prisma.user.updateMany({
        where: { roles: { some: { roleId } } },
        data: { tokenVersion: { increment: 1 } },
      }),
    ]);
    const affected = await this.prisma.user.findMany({
      where: { roles: { some: { roleId } } },
      select: { id: true },
    });
    await Promise.all(affected.map(({ id }) => this.cache.del(sessionKey(id))));
  }

  private assertSuper(actor: AuthenticatedUser) {
    if (!actor.isSuper) {
      throw new ForbiddenException('仅超级管理员可以修改菜单定义');
    }
  }
}

async function resolveViewsDirectory(): Promise<string> {
  const candidates = [
    resolve(process.cwd(), '../admin/src/views'),
    resolve(process.cwd(), 'admin/src/views'),
    resolve(__dirname, '../../../admin/src/views'),
  ];

  for (const dir of candidates) {
    try {
      const current = await stat(dir);
      if (current.isDirectory()) return dir;
    } catch {
      // continue to next candidate
    }
  }

  throw new NotFoundException('未找到前端 views 目录');
}

async function walkVueFiles(root: string): Promise<string[]> {
  const list: string[] = [];
  const queue = [''];

  while (queue.length > 0) {
    const relative = queue.shift()!;
    const absolute = join(root, relative);
    const entries = await readdir(absolute, { withFileTypes: true });

    for (const entry of entries) {
      const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        queue.push(childRelative);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith('.vue')) continue;

      const withoutExt = childRelative.slice(0, -'.vue'.length);
      list.push(withoutExt);
    }
  }

  return list;
}

function buildMenuTree(rows: MenuRow[]): MenuNode[] {
  const nodes = new Map<number, MenuNode>();
  for (const r of rows) {
    nodes.set(r.id, {
      id: r.id,
      name: r.name,
      path: r.path,
      component: r.component,
      icon: r.icon,
      sort: r.sort,
      children: [],
    });
  }

  const roots: MenuNode[] = [];
  for (const r of rows) {
    const node = nodes.get(r.id)!;
    if (typeof r.parentId === 'number') {
      const parent = nodes.get(r.parentId);
      if (parent) {
        parent.children.push(node);
        continue;
      }
    }
    roots.push(node);
  }

  const sortTree = (list: MenuNode[]) => {
    list.sort((a, b) => a.sort - b.sort || a.id - b.id);
    for (const item of list) sortTree(item.children);
  };
  sortTree(roots);

  return roots;
}
