<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessageBox } from "element-plus";
import { Plus, RefreshCw, Search, UserRound } from "lucide-vue-next";
import { api } from "../../api";
import { Button } from "../../components/ui/button";
import AppDrawer from "../../components/common/AppDrawer.vue";
import { toast } from "../../components/ui/toast";
import { useAuthStore, type UserRole } from "../../stores/auth";

type Department = { id: number; code: string; name: string; enabled: boolean };
type User = { id: number; username: string; enabled: boolean; department: Department | null; roles: UserRole[]; createdAt: string };
const auth = useAuthStore();
const users = ref<User[]>([]);
const roles = ref<UserRole[]>([]);
const departments = ref<Department[]>([]);
const loading = ref(false);
const saving = ref(false);
const query = ref("");
const page = ref(1);
const pageSize = 10;
const drawerOpen = ref(false);
const editing = ref<User | null>(null);
const model = ref({ username: "", password: "", roleIds: [] as number[], departmentId: null as number | null });
const filteredUsers = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  return keyword ? users.value.filter((user) => [user.username, user.department?.name, ...user.roles.map((r) => r.name)].some((v) => v?.toLowerCase().includes(keyword))) : users.value;
});
const pagedUsers = computed(() =>
  filteredUsers.value.slice((page.value - 1) * pageSize, page.value * pageSize),
);
const canSave = computed(() => editing.value ? model.value.roleIds.length > 0 : model.value.username.trim().length >= 2 && model.value.password.length >= 12 && model.value.roleIds.length > 0);

async function load() {
  loading.value = true;
  try {
    const [userRes, roleRes, departmentRes] = await Promise.all([api.get<User[]>("/user"), api.get<UserRole[]>("/role"), api.get<Department[]>("/department")]);
    users.value = userRes.data;
    roles.value = roleRes.data.filter((r) => r.enabled);
    departments.value = departmentRes.data.filter((d) => d.enabled);
  } finally { loading.value = false; }
}
function openCreate() {
  editing.value = null;
  model.value = { username: "", password: "", roleIds: roles.value[0] ? [roles.value[0].id] : [], departmentId: departments.value[0]?.id ?? null };
  drawerOpen.value = true;
}
function openEdit(user: User) {
  editing.value = user;
  model.value = { username: user.username, password: "", roleIds: user.roles.map((r) => r.id), departmentId: user.department?.id ?? null };
  drawerOpen.value = true;
}
async function save() {
  if (!canSave.value || saving.value) return;
  saving.value = true;
  try {
    if (editing.value) {
      await Promise.all([
        api.patch(`/user/${editing.value.id}/roles`, { roleIds: model.value.roleIds }),
        api.patch(`/user/${editing.value.id}/department`, { departmentId: model.value.departmentId }),
      ]);
      toast({ title: "用户信息已更新" });
    } else {
      await api.post("/user", model.value);
      toast({ title: "用户已创建" });
    }
    drawerOpen.value = false; await load();
  } finally { saving.value = false; }
}
async function toggleStatus(user: User) {
  try {
    await ElMessageBox.confirm(`确认${user.enabled ? "停用" : "启用"}“${user.username}”吗？`, "状态确认", { confirmButtonText: "确认", cancelButtonText: "取消", type: "warning" });
  } catch { return; }
  await api.patch(`/user/${user.id}/status`, { enabled: !user.enabled });
  toast({ title: user.enabled ? "用户已停用" : "用户已启用" }); await load();
}
onMounted(load);
</script>

<template>
  <div class="page-shell">
    <header class="page-header">
      <div><h1 class="page-title">用户管理</h1><p class="page-description">维护团队成员、所属部门和角色，确保每个人拥有合适的工作范围。</p></div>
      <div class="page-actions"><Button variant="secondary" :loading="loading" @click="load"><RefreshCw class="h-4 w-4" />刷新</Button><Button v-permission="'user:create'" @click="openCreate"><Plus class="h-4 w-4" />新增用户</Button></div>
    </header>
    <section class="query-panel" aria-label="查询条件">
      <div class="field w-full sm:max-w-sm"><label for="user-query">搜索用户</label><div class="relative"><Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="user-query" v-model="query" class="app-input pl-10" placeholder="姓名、部门或角色" @input="page = 1" /></div></div>
      <div class="ml-auto pb-2 text-xs text-slate-500">共 {{ filteredUsers.length }} 位用户</div>
    </section>
    <section class="table-panel" aria-label="用户列表">
      <div class="table-scroll"><table class="data-table"><thead><tr><th>用户</th><th>部门</th><th>角色</th><th>状态</th><th class="text-right">操作</th></tr></thead>
        <tbody>
          <tr v-for="user in pagedUsers" :key="user.id">
            <td><div class="flex items-center gap-3"><span class="avatar small"><UserRound class="h-4 w-4" /></span><div><strong>{{ user.username }}</strong><div class="mt-1 text-xs text-slate-400">加入于 {{ new Date(user.createdAt).toLocaleDateString() }}</div></div></div></td>
            <td>{{ user.department?.name ?? "未分配" }}</td><td>{{ user.roles.map((r) => r.name).join("、") || "未分配" }}</td>
            <td><span class="status-pill" :class="user.enabled ? 'success' : 'muted'">{{ user.enabled ? "正常" : "已停用" }}</span></td>
            <td><div class="flex justify-end gap-2"><Button v-permission="'user:update'" size="sm" variant="ghost" :disabled="user.id === auth.currentUser?.id" @click="openEdit(user)">编辑</Button><Button v-permission="'user:update'" size="sm" variant="secondary" :disabled="user.id === auth.currentUser?.id" @click="toggleStatus(user)">{{ user.enabled ? "停用" : "启用" }}</Button></div></td>
          </tr>
          <tr v-if="loading"><td colspan="5" class="empty-state">正在加载用户信息…</td></tr>
          <tr v-else-if="!filteredUsers.length"><td colspan="5" class="empty-state">没有找到符合条件的用户</td></tr>
        </tbody>
      </table></div>
    </section>
    <footer class="flex flex-col items-center justify-between gap-3 sm:flex-row"><span class="text-xs text-slate-500">共 {{ filteredUsers.length }} 条</span><el-pagination v-model:current-page="page" background layout="prev, pager, next" :page-size="pageSize" :total="filteredUsers.length" hide-on-single-page /></footer>
  </div>

  <AppDrawer v-model:open="drawerOpen" :title="editing ? '编辑用户' : '新增用户'" :description="editing ? '调整用户的部门与角色。' : '填写基本信息并安排所属部门与角色。'" :busy="saving">
    <div class="grid gap-5">
      <div class="field"><label for="user-name">账号</label><input id="user-name" v-model="model.username" class="app-input" :disabled="!!editing" autocomplete="off" placeholder="请输入账号" /></div>
      <div v-if="!editing" class="field"><label for="user-password">初始密码</label><input id="user-password" v-model="model.password" class="app-input" autocomplete="new-password" type="password" placeholder="至少 12 位" /><p class="field-hint">建议使用字母、数字和符号组合。</p></div>
      <div class="field"><label>所属部门</label><el-select v-model="model.departmentId" class="w-full" clearable placeholder="请选择部门"><el-option v-for="item in departments" :key="item.id" :label="item.name" :value="item.id" /></el-select></div>
      <div class="field"><label>角色</label><el-select v-model="model.roleIds" class="w-full" multiple placeholder="请选择角色"><el-option v-for="item in roles" :key="item.id" :label="item.name" :value="item.id" /></el-select></div>
    </div>
    <template #footer><Button variant="secondary" :disabled="saving" @click="drawerOpen = false">取消</Button><Button :loading="saving" :disabled="!canSave" @click="save">{{ editing ? "保存修改" : "确认新增" }}</Button></template>
  </AppDrawer>
</template>
