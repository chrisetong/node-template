import type { AxiosInstance } from "axios";
import type { MenuNode, UserRole } from "../stores/auth";

type Department = { id: number; code: string; name: string; enabled: boolean };
type User = { id: number; username: string; enabled: boolean; department: Department | null; roles: UserRole[]; createdAt: string };
type MenuRow = { id: number; name: string; path: string; component: string; icon: string; parentId: number | null; sort: number; permissions: string[] };
type Body = Record<string, unknown>;

const permissions = ["route:/admin/users", "route:/admin/roles", "route:/admin/departments", "route:/admin/menus", "route:/admin/role-menus", "route:/admin/audit-logs", "route:/admin/system-settings", "route:/profile", "user:create", "user:update", "role:create", "role:update", "department:create", "department:update", "menu:create", "menu:update", "menu:delete", "roleMenu:update", "systemSetting:update", "file:upload"];
let departments: Department[] = [
  { id: 1, code: "HQ", name: "总部", enabled: true },
  { id: 2, code: "PRODUCT", name: "产品研发部", enabled: true },
  { id: 3, code: "MARKETING", name: "市场运营部", enabled: true },
];
let roles: (UserRole & { dataScope: string; departmentIds: number[] })[] = [
  { id: 1, code: "SUPER_ADMIN", name: "超级管理员", enabled: true, isSuper: true, dataScope: "ALL", departmentIds: [] },
  { id: 2, code: "OPERATION_MANAGER", name: "运营管理员", enabled: true, isSuper: false, dataScope: "DEPARTMENT_AND_CHILDREN", departmentIds: [3] },
  { id: 3, code: "MEMBER", name: "普通成员", enabled: true, isSuper: false, dataScope: "SELF", departmentIds: [] },
];
let users: User[] = [
  { id: 1, username: "demo-admin", enabled: true, department: departments[0], roles: [roles[0]], createdAt: "2026-07-28T08:30:00.000Z" },
  { id: 2, username: "lin", enabled: true, department: departments[1], roles: [roles[1]], createdAt: "2026-07-21T02:15:00.000Z" },
  { id: 3, username: "mei", enabled: true, department: departments[2], roles: [roles[2]], createdAt: "2026-07-18T06:20:00.000Z" },
];
let menus: MenuRow[] = [
  { id: 1, name: "工作概览", path: "/", component: "Home", icon: "LayoutDashboard", parentId: null, sort: 1, permissions: [] },
  { id: 10, name: "组织与权限", path: "/admin", component: "", icon: "ShieldCheck", parentId: null, sort: 10, permissions: [] },
  { id: 11, name: "用户管理", path: "/admin/users", component: "admin/Users", icon: "Users", parentId: 10, sort: 1, permissions: ["user:create", "user:update"] },
  { id: 12, name: "角色管理", path: "/admin/roles", component: "admin/Roles", icon: "BadgeCheck", parentId: 10, sort: 2, permissions: ["role:create", "role:update"] },
  { id: 13, name: "部门管理", path: "/admin/departments", component: "admin/Departments", icon: "Building2", parentId: 10, sort: 3, permissions: ["department:create", "department:update"] },
  { id: 14, name: "菜单管理", path: "/admin/menus", component: "admin/Menus", icon: "PanelLeft", parentId: 10, sort: 4, permissions: ["menu:create", "menu:update", "menu:delete"] },
  { id: 15, name: "角色功能范围", path: "/admin/role-menus", component: "admin/RoleMenus", icon: "ListChecks", parentId: 10, sort: 5, permissions: ["roleMenu:update"] },
  { id: 20, name: "平台设置", path: "/settings", component: "", icon: "Settings2", parentId: null, sort: 20, permissions: [] },
  { id: 21, name: "界面设置", path: "/admin/system-settings", component: "admin/SystemSettings", icon: "Palette", parentId: 20, sort: 1, permissions: ["systemSetting:update"] },
  { id: 22, name: "操作记录", path: "/admin/audit-logs", component: "admin/AuditLogs", icon: "ScrollText", parentId: 20, sort: 2, permissions: [] },
];
let systemSetting = { siteName: "澄序演示后台", loginLogoPath: "", loginDescription: "用于展示基础后台的页面、表格、抽屉与设置能力。", loginBackgroundPath: "", filingText: "交互演示 · 数据仅保存在当前浏览器会话", filingUrl: "" };
const roleMenuIds = new Map<number, number[]>([[2, [1, 10, 11, 12, 13]], [3, [1]]]);
const logs = [
  { id: "log-001", actorName: "demo-admin", action: "SYSTEM_SETTING_UPDATE", resource: "systemSetting", resourceId: "1", method: "PATCH", path: "/system-setting", ip: "127.0.0.1", statusCode: 200, success: true, durationMs: 38, createdAt: "2026-07-30T02:18:00.000Z" },
  { id: "log-002", actorName: "lin", action: "USER_UPDATE", resource: "user", resourceId: "3", method: "PATCH", path: "/user/3/status", ip: "127.0.0.1", statusCode: 200, success: true, durationMs: 24, createdAt: "2026-07-29T09:42:00.000Z" },
  { id: "log-003", actorName: "demo-admin", action: "AUTH_LOGIN", resource: "auth", resourceId: null, method: "POST", path: "/auth/login", ip: "127.0.0.1", statusCode: 200, success: true, durationMs: 84, createdAt: "2026-07-29T01:05:00.000Z" },
];

export function installDemoApi(api: AxiosInstance) {
  api.defaults.adapter = async (config) => ({ data: clone(await request(config.url ?? "", config.method ?? "get", config.data, config.params)), status: 200, statusText: "OK", headers: {}, config, request: {} });
}

async function request(rawUrl: string, rawMethod: string, data: unknown, params?: Body): Promise<unknown> {
  const url = rawUrl.split("?")[0]; const method = rawMethod.toLowerCase(); const body = parseBody(data);
  if (method === "get" && url === "/auth/captcha") return { key: "demo-captcha", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="130" height="48"><rect width="130" height="48" fill="#f4f7fc"/><text x="21" y="32" font-family="monospace" font-size="21" font-weight="700" letter-spacing="5" fill="#245fae">DEMO</text></svg>' };
  if (method === "post" && ["/auth/login", "/auth/logout"].includes(url)) return url.endsWith("login") ? { accessToken: "demo-access-token" } : {};
  if (method === "get" && url === "/auth/me") return { user: users[0], menuTree: menuTree(), permissions };
  if (method === "get" && ["/system-setting/public", "/system-setting"].includes(url)) return systemSetting;
  if (method === "patch" && url === "/system-setting") return (systemSetting = { ...systemSetting, ...body });
  if (method === "post" && (url === "/file/upload" || url.startsWith("/system-setting/upload/"))) return { relativePath: uploadUrl(data) };
  if (method === "get" && url === "/department") return departments;
  if (method === "post" && url === "/department") return addDepartment(body);
  if (method === "patch" && /^\/department\/\d+$/.test(url)) return updateDepartment(id(url), body);
  if (method === "get" && url === "/role") return roles;
  if (method === "post" && url === "/role") return addRole(body);
  if (method === "patch" && /^\/role\/\d+(?:\/data-scope)?$/.test(url)) return updateRole(id(url), body);
  if (method === "get" && url === "/user") return users;
  if (method === "post" && url === "/user") return addUser(body);
  if (method === "patch" && /^\/user\/\d+\/(roles|department|status)$/.test(url)) return updateUser(id(url), url, body);
  if (method === "patch" && url === "/user/profile/password") return {};
  if (method === "get" && url === "/menu") return menus;
  if (method === "get" && url === "/menu/tree") return menuTree();
  if (method === "get" && url === "/menu/components/views") return { components: ["Home", "admin/Users", "admin/Roles", "admin/Departments", "admin/Menus", "admin/RoleMenus", "admin/AuditLogs", "admin/SystemSettings", "profile/index"] };
  if (method === "post" && url === "/menu") return addMenu(body);
  if (method === "patch" && /^\/menu\/\d+$/.test(url)) return updateMenu(id(url), body);
  if (method === "delete" && /^\/menu\/\d+$/.test(url)) { const value = id(url); menus = menus.filter((item) => item.id !== value && item.parentId !== value); return {}; }
  if (method === "get" && /^\/menu\/roles\/\d+$/.test(url)) return { menuIds: roleMenuIds.get(id(url)) ?? menus.map((item) => item.id) };
  if (method === "patch" && /^\/menu\/roles\/\d+$/.test(url)) { roleMenuIds.set(id(url), Array.isArray(body.menuIds) ? body.menuIds.map(Number) : []); return {}; }
  if (method === "get" && url === "/audit-log") return getLogs(params);
  return {};
}

function addDepartment(body: Body) { const item = { id: next(departments), code: String(body.code ?? "NEW_DEPARTMENT").toUpperCase(), name: String(body.name ?? "新建部门"), enabled: body.enabled !== false }; departments = [item, ...departments]; return item; }
function updateDepartment(value: number, body: Body) { departments = departments.map((item) => item.id === value ? { ...item, ...body } : item); return departments.find((item) => item.id === value); }
function addRole(body: Body) { const item = { id: next(roles), code: String(body.code ?? "NEW_ROLE").toUpperCase(), name: String(body.name ?? "新建角色"), enabled: true, isSuper: false, dataScope: "SELF", departmentIds: [] }; roles = [...roles, item]; return item; }
function updateRole(value: number, body: Body) { roles = roles.map((item) => item.id === value ? { ...item, ...body } : item); return roles.find((item) => item.id === value); }
function addUser(body: Body) { const item: User = { id: next(users), username: String(body.username ?? "new-member"), enabled: true, department: departments.find((d) => d.id === Number(body.departmentId)) ?? null, roles: roles.filter((r) => (body.roleIds as number[] | undefined)?.includes(r.id)), createdAt: new Date().toISOString() }; users = [item, ...users]; return item; }
function updateUser(value: number, url: string, body: Body) { users = users.map((item) => { if (item.id !== value) return item; if (url.endsWith("/roles")) return { ...item, roles: roles.filter((r) => (body.roleIds as number[]).includes(r.id)) }; if (url.endsWith("/department")) return { ...item, department: departments.find((d) => d.id === Number(body.departmentId)) ?? null }; return { ...item, enabled: Boolean(body.enabled) }; }); return users.find((item) => item.id === value); }
function addMenu(body: Body) { const item: MenuRow = { id: next(menus), name: String(body.name ?? "新建菜单"), path: String(body.path ?? "/new-page"), component: String(body.component ?? ""), icon: String(body.icon ?? "CircleDot"), parentId: (body.parentId as number | null) ?? null, sort: Number(body.sort ?? 0), permissions: Array.isArray(body.permissions) ? body.permissions.map(String) : [] }; menus = [...menus, item]; return item; }
function updateMenu(value: number, body: Body) { menus = menus.map((item) => item.id === value ? { ...item, ...body } : item); return menus.find((item) => item.id === value); }
function menuTree(): MenuNode[] { const nodes = new Map<number, MenuNode>(); menus.forEach((item) => nodes.set(item.id, { ...item, children: [] })); const roots: MenuNode[] = []; menus.forEach((item) => { const node = nodes.get(item.id)!; const parent = item.parentId ? nodes.get(item.parentId) : undefined; parent ? parent.children.push(node) : roots.push(node); }); const order = (items: MenuNode[]) => { items.sort((a, b) => a.sort - b.sort || a.id - b.id); items.forEach((item) => order(item.children)); }; order(roots); return roots; }
function getLogs(params?: Body) { const action = String(params?.action ?? "").toLowerCase(); const success = String(params?.success ?? ""); const items = logs.filter((item) => (!action || item.action.toLowerCase().includes(action)) && (!success || String(item.success) === success)); const page = Math.max(1, Number(params?.page ?? 1)); const size = Math.max(1, Number(params?.pageSize ?? 20)); return { items: items.slice((page - 1) * size, page * size), total: items.length }; }
function parseBody(data: unknown): Body { if (!data || typeof data !== "string") return (data as Body) ?? {}; try { return JSON.parse(data) as Body; } catch { return {}; } }
function uploadUrl(data: unknown) { if (!(data instanceof FormData)) return ""; const file = data.get("file"); return typeof File !== "undefined" && file instanceof File ? URL.createObjectURL(file) : ""; }
function next(items: { id: number }[]) { return Math.max(0, ...items.map((item) => item.id)) + 1; }
function id(url: string) { return Number(url.match(/\/(\d+)(?:\/[^/]+)?$/)?.[1] ?? 0); }
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
