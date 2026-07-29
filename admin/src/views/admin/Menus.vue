<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Plus, Save, Trash2 } from "lucide-vue-next";
import { ElMessageBox } from "element-plus";
import { api } from "../../api";
import { useAuthStore, type MenuNode } from "../../stores/auth";
import { Button } from "../../components/ui/button";
import AppDrawer from "../../components/common/AppDrawer.vue";
import { Table } from "../../components/ui/table";
import { toast } from "../../components/ui/toast";
import IconPicker from "../../components/common/IconPicker.vue";
import { resolveAppIcon } from "../../lib/app-icons";

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

type EditModel = {
  id?: number;
  name: string;
  path: string;
  component: string;
  icon: string;
  parentId: number | null;
  sort: number;
  permissionsText: string;
};

const authStore = useAuthStore();

const loading = ref(false);
const rows = ref<MenuRow[]>([]);
const tree = ref<MenuNode[]>([]);
const componentOptions = ref<string[]>([]);
const rowById = computed(() => new Map(rows.value.map((r) => [r.id, r])));

const dialogOpen = ref(false);
const saving = ref(false);
const deletingId = ref<number | null>(null);

const model = ref<EditModel>({
  name: "",
  path: "",
  component: "",
  icon: "CircleDot",
  parentId: null,
  sort: 0,
  permissionsText: "",
});

function toPermissionsText(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === "string").join(", ");
  }
  return "";
}

const parentCandidates = computed(() =>
  rows.value.map((r) => ({ id: r.id, name: r.name, path: r.path })),
);

function flatten(
  nodes: MenuNode[],
  depth = 0,
): { node: MenuNode; depth: number }[] {
  const result: { node: MenuNode; depth: number }[] = [];
  const ordered = [...nodes].sort((a, b) => a.sort - b.sort || a.id - b.id);
  for (const n of ordered) {
    result.push({ node: n, depth });
    if (n.children?.length) {
      result.push(...flatten(n.children, depth + 1));
    }
  }
  return result;
}

const flatTree = computed(() => flatten(tree.value));
const selectableComponents = computed(() => {
  const set = new Set(componentOptions.value);
  const current = model.value.component.trim();
  if (current) set.add(current);
  return Array.from(set).sort((a, b) => a.localeCompare(b));
});
const componentLabels: Record<string, string> = {
  "Home": "工作概览",
  "admin/Users": "用户管理",
  "admin/Roles": "角色管理",
  "admin/Menus": "菜单管理",
  "admin/Departments": "部门管理",
  "admin/RoleMenus": "角色功能范围",
  "admin/AuditLogs": "操作记录",
  "profile/index": "个人设置",
};
function componentLabel(path: string) {
  return componentLabels[path] ?? `业务页面 ${selectableComponents.value.indexOf(path) + 1}`;
}

async function load() {
  loading.value = true;
  try {
    const [listRes, treeRes, componentRes] = await Promise.all([
      api.get<MenuRow[]>("/menu"),
      api.get<MenuNode[]>("/menu/tree"),
      api.get<{ components: string[] }>("/menu/components/views"),
    ]);
    rows.value = listRes.data;
    tree.value = treeRes.data;
    componentOptions.value = componentRes.data?.components ?? [];
  } catch {
    toast({
      title: "加载失败",
      description: "暂时无法加载菜单，请稍后重试",
      variant: "destructive",
    });
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  model.value = {
    name: "",
    path: "",
    component: "",
    icon: "CircleDot",
    parentId: null,
    sort: 0,
    permissionsText: "",
  };
  dialogOpen.value = true;
}

function openEdit(row: MenuRow) {
  model.value = {
    id: row.id,
    name: row.name,
    path: row.path,
    component: row.component,
    icon: row.icon,
    parentId: row.parentId,
    sort: row.sort,
    permissionsText: toPermissionsText(row.permissions),
  };
  dialogOpen.value = true;
}

function parsePermissions(text: string) {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function save() {
  if (saving.value) return;
  saving.value = true;
  try {
    const payload = {
      name: model.value.name.trim(),
      path: model.value.path.trim(),
      component: model.value.component.trim(),
      icon: model.value.icon.trim() || "CircleDot",
      parentId: model.value.parentId,
      sort: Number.isFinite(model.value.sort) ? model.value.sort : 0,
      permissions: parsePermissions(model.value.permissionsText),
    };

    if (!payload.name || !payload.path) {
      toast({
        title: "校验失败",
        description: "菜单名称与路径必填",
        variant: "destructive",
      });
      return;
    }

    if (model.value.id) {
      await api.patch(`/menu/${model.value.id}`, payload);
      toast({ title: "保存成功", description: "菜单已更新" });
    } else {
      await api.post("/menu", payload);
      toast({ title: "创建成功", description: "菜单已创建" });
    }

    dialogOpen.value = false;
    await load();
    await authStore.fetchMe();
  } catch {
    toast({
      title: "保存失败",
      description: "未能保存菜单，请检查信息后重试",
      variant: "destructive",
    });
  } finally {
    saving.value = false;
  }
}

async function removeMenu(id: number) {
  if (deletingId.value) return;
  const target = rowById.value.get(id);
  try {
    await ElMessageBox.confirm(
      `确认删除“${target?.name ?? "此菜单"}”吗？`,
      "删除确认",
      { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning" },
    );
  } catch {
    return;
  }
  deletingId.value = id;
  try {
    await api.delete(`/menu/${id}`);
    toast({ title: "删除成功", description: "菜单已删除" });
    await load();
    await authStore.fetchMe();
  } catch {
    toast({
      title: "删除失败",
      description: "未能删除菜单，请稍后重试",
      variant: "destructive",
    });
  } finally {
    deletingId.value = null;
  }
}

onMounted(load);
</script>

<template>
  <div class="page-shell">
    <div>
      <h1 class="page-title">菜单管理</h1>
      <p class="page-description">整理工作台导航与页面层级，让团队成员快速找到所需功能。</p>
    </div>

    <div class="flex items-center justify-between gap-4">
      <div class="text-sm text-neutral-600 dark:text-neutral-400">
        共 {{ rows.length }} 条
      </div>
      <div class="flex items-center gap-2">
        <Button
          variant="secondary"
          :loading="loading"
          :disabled="loading"
          @click="load"
          >刷新</Button
        >
        <Button v-permission="'menu:create'" @click="openCreate">
          <Plus class="h-4 w-4" />
          新增菜单
        </Button>
      </div>
    </div>

    <div class="table-panel">
        <Table>
          <thead
            class="bg-neutral-50 text-neutral-600 dark:bg-neutral-900/40 dark:text-neutral-300"
          >
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold">名称</th>
              <th class="px-4 py-3 text-left text-xs font-semibold">图标</th>
              <th class="px-4 py-3 text-left text-xs font-semibold">排序</th>
              <th class="px-4 py-3 text-right text-xs font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in flatTree"
              :key="item.node.id"
              class="border-t border-neutral-200 text-neutral-800 hover:bg-neutral-50 dark:border-neutral-900/80 dark:text-neutral-200 dark:hover:bg-neutral-900/20"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <span class="inline-block w-4 shrink-0" />
                  <span
                    :style="{ paddingLeft: `${item.depth * 14}px` }"
                    class="font-semibold text-neutral-900 dark:text-neutral-50"
                  >
                    {{ item.node.name }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                  <component :is="resolveAppIcon(item.node.icon)" class="h-4 w-4" />
                </span>
              </td>
              <td
                class="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400"
              >
                {{ item.node.sort }}
              </td>
              <td class="px-4 py-3 text-right">
                <div class="inline-flex gap-2">
                  <Button
                    v-permission="'menu:update'"
                    size="sm"
                    variant="ghost"
                    :disabled="!rowById.get(item.node.id)"
                    @click="
                      rowById.get(item.node.id) &&
                      openEdit(rowById.get(item.node.id)!)
                    "
                  >
                    编辑
                  </Button>
                  <Button
                    v-permission="'menu:delete'"
                    size="sm"
                    variant="ghost"
                    :loading="deletingId === item.node.id"
                    :disabled="deletingId === item.node.id"
                    @click="removeMenu(item.node.id)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>

            <tr v-if="!loading && flatTree.length === 0">
              <td
                class="px-4 py-10 text-center text-sm text-neutral-500"
                colspan="4"
              >
                暂无数据
              </td>
            </tr>
            <tr v-if="loading">
              <td
                class="px-4 py-10 text-center text-sm text-neutral-500"
                colspan="4"
              >
                加载中…
              </td>
            </tr>
          </tbody>
        </Table>
    </div>
  </div>

  <AppDrawer
    v-model:open="dialogOpen"
    :title="model.id ? '编辑菜单' : '新增菜单'"
    description="设置菜单名称、页面位置、图标与层级关系。"
    :busy="saving"
  >
    <div class="grid gap-5">
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="grid gap-2">
          <label
            class="text-sm font-medium text-neutral-800 dark:text-neutral-200"
            >名称</label
          >
          <input
            v-model="model.name"
            class="h-11 w-full rounded-xl bg-white px-4 text-sm text-neutral-900 ring-1 ring-neutral-200 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-neutral-900 dark:text-neutral-50 dark:ring-neutral-800 dark:placeholder:text-neutral-500"
            placeholder="例如：菜单管理"
          />
        </div>

        <div class="grid gap-2">
          <label
            class="text-sm font-medium text-neutral-800 dark:text-neutral-200"
            >访问位置</label
          >
          <input
            v-model="model.path"
            class="h-11 w-full rounded-xl bg-white px-4 text-sm text-neutral-900 ring-1 ring-neutral-200 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-neutral-900 dark:text-neutral-50 dark:ring-neutral-800 dark:placeholder:text-neutral-500"
            placeholder="例如：/work/overview"
          />
        </div>
      </div>

      <div class="grid gap-2">
        <label
          class="text-sm font-medium text-neutral-800 dark:text-neutral-200"
          >页面内容</label
        >
        <select
          v-model="model.component"
          class="h-11 w-full rounded-xl bg-white px-4 text-sm text-neutral-900 ring-1 ring-neutral-200 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-neutral-900 dark:text-neutral-50 dark:ring-neutral-800 dark:placeholder:text-neutral-500"
        >
          <option value="">无（目录菜单）</option>
          <option
            v-for="path in selectableComponents"
            :key="path"
            :value="path"
          >
            {{ componentLabel(path) }}
          </option>
        </select>
        <div class="text-xs text-neutral-500 dark:text-neutral-500">
          请选择此菜单打开后展示的页面。
        </div>
      </div>

      <div class="grid gap-2">
        <label
          class="text-sm font-medium text-neutral-800 dark:text-neutral-200"
          >图标</label
        >
        <IconPicker v-model="model.icon" />
      </div>

      <div class="grid gap-2 sm:grid-cols-2">
        <div class="grid gap-2">
          <label
            class="text-sm font-medium text-neutral-800 dark:text-neutral-200"
            >父菜单</label
          >
          <select
            v-model="model.parentId"
            class="h-11 w-full rounded-xl bg-white px-4 text-sm text-neutral-900 ring-1 ring-neutral-200 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-neutral-900 dark:text-neutral-50 dark:ring-neutral-800"
          >
            <option :value="null">无（顶级）</option>
            <option v-for="p in parentCandidates" :key="p.id" :value="p.id">
              {{ p.name }}
            </option>
          </select>
        </div>
        <div class="grid gap-2">
          <label
            class="text-sm font-medium text-neutral-800 dark:text-neutral-200"
            >排序</label
          >
          <input
            v-model.number="model.sort"
            class="h-11 w-full rounded-xl bg-white px-4 text-sm text-neutral-900 ring-1 ring-neutral-200 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-neutral-900 dark:text-neutral-50 dark:ring-neutral-800"
            type="number"
            min="0"
          />
        </div>
      </div>

    </div>

    <template #footer>
      <Button variant="secondary" :disabled="saving" @click="dialogOpen = false"
        >取消</Button
      >
      <Button :loading="saving" :disabled="saving" @click="save">
        <Save class="h-4 w-4" />
        {{ saving ? "保存中…" : "保存" }}
      </Button>
    </template>
  </AppDrawer>
</template>
