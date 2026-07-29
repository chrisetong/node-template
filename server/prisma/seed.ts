import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME?.trim() || 'admin';
  const plainPassword = process.env.SEED_ADMIN_PASSWORD?.trim();
  if (!plainPassword || plainPassword.length < 12) {
    throw new Error(
      'SEED_ADMIN_PASSWORD must be explicitly set to at least 12 characters',
    );
  }
  const cost = parseBoundedInt(process.env.BCRYPT_COST, 12, 10, 14);
  const password = await bcrypt.hash(plainPassword, cost);

  const rootDepartment = await prisma.department.upsert({
    where: { code: 'HEADQUARTERS' },
    create: {
      code: 'HEADQUARTERS',
      name: '总部',
      sort: 0,
      enabled: true,
    },
    update: { name: '总部', enabled: true },
  });

  const adminRole = await prisma.role.upsert({
    where: { code: 'SUPER_ADMIN' },
    create: {
      code: 'SUPER_ADMIN',
      name: '超级管理员',
      isSuper: true,
      dataScope: 'ALL',
    },
    update: {
      name: '超级管理员',
      enabled: true,
      isSuper: true,
      dataScope: 'ALL',
    },
  });
  const userRole = await prisma.role.upsert({
    where: { code: 'USER' },
    create: { code: 'USER', name: '普通用户', dataScope: 'SELF' },
    update: { name: '普通用户', dataScope: 'SELF' },
  });

  const admin = await prisma.user.upsert({
    where: { username },
    create: {
      username,
      password,
      departmentId: rootDepartment.id,
      roles: { create: { roleId: adminRole.id } },
    },
    update: { enabled: true, departmentId: rootDepartment.id },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    create: { userId: admin.id, roleId: adminRole.id },
    update: {},
  });

  const system = await upsertMenu('系统管理', '/admin', '', 'Settings', 10, []);
  const menus = await Promise.all([
    upsertMenu(
      '用户管理',
      '/users',
      'admin/Users',
      'Users',
      1,
      ['user:read', 'user:create', 'user:update', 'department:read'],
      system.id,
    ),
    upsertMenu(
      '角色管理',
      '/roles',
      'admin/Roles',
      'Shield',
      2,
      ['role:read', 'role:create', 'role:update', 'department:read'],
      system.id,
    ),
    upsertMenu(
      '菜单管理',
      '/menus',
      'admin/Menus',
      'Menu',
      3,
      ['menu:read', 'menu:create', 'menu:update', 'menu:delete'],
      system.id,
    ),
    upsertMenu(
      '角色权限',
      '/role-menus',
      'admin/RoleMenus',
      'ShieldCheck',
      4,
      ['roleMenu:read', 'roleMenu:update'],
      system.id,
    ),
    upsertMenu(
      '部门管理',
      '/departments',
      'admin/Departments',
      'Building2',
      5,
      ['department:read', 'department:create', 'department:update'],
      system.id,
    ),
    upsertMenu(
      '审计日志',
      '/audit-logs',
      'admin/AuditLogs',
      'ScrollText',
      6,
      ['audit:read'],
      system.id,
    ),
    upsertMenu(
      '系统设置',
      '/system-settings',
      'admin/SystemSettings',
      'SlidersHorizontal',
      7,
      ['systemSetting:read', 'systemSetting:update'],
      system.id,
    ),
    upsertMenu('个人中心', '/profile', 'profile/index', 'UserRound', 20, [
      'file:upload',
    ]),
  ]);

  await prisma.systemSetting.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });

  await prisma.roleMenu.createMany({
    data: [system, ...menus].map((menu) => ({
      roleId: adminRole.id,
      menuId: menu.id,
    })),
    skipDuplicates: true,
  });
  const profile = menus.find((menu) => menu.path === '/profile');
  if (profile) {
    await prisma.roleMenu.upsert({
      where: { roleId_menuId: { roleId: userRole.id, menuId: profile.id } },
      create: { roleId: userRole.id, menuId: profile.id },
      update: {},
    });
  }
  console.log(`[seed] administrator ready: ${username}`);
}

function upsertMenu(
  name: string,
  path: string,
  component: string,
  icon: string,
  sort: number,
  permissions: string[],
  parentId: number | null = null,
) {
  return prisma.menu.upsert({
    where: { path },
    create: { name, path, component, icon, sort, permissions, parentId },
    update: { name, component, icon, sort, permissions, parentId },
  });
}

function parseBoundedInt(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max
    ? parsed
    : fallback;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
