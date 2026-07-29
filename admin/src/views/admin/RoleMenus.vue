<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { api } from "../../api";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { toast } from "../../components/ui/toast";
import { useAuthStore, type MenuNode, type UserRole } from "../../stores/auth";

const auth = useAuthStore();
const roles = ref<UserRole[]>([]);
const roleId = ref<number | null>(null);
const tree = ref<MenuNode[]>([]);
const checked = ref(new Set<number>());
const saving = ref(false);
const flat = computed(() => {
  const walk = (
    nodes: MenuNode[],
    depth = 0,
  ): { node: MenuNode; depth: number }[] =>
    nodes.flatMap((node) => [
      { node, depth },
      ...walk(node.children ?? [], depth + 1),
    ]);
  return walk(tree.value);
});

async function loadRoles() {
  roles.value = (await api.get<UserRole[]>("/role")).data.filter(
    (role) => !role.isSuper,
  );
  roleId.value ??= roles.value[0]?.id ?? null;
  await load();
}
async function load() {
  if (!roleId.value) return;
  const [treeRes, bindingRes] = await Promise.all([
    api.get<MenuNode[]>("/menu/tree"),
    api.get<{ menuIds: number[] }>(`/menu/roles/${roleId.value}`),
  ]);
  tree.value = treeRes.data;
  checked.value = new Set(bindingRes.data.menuIds);
}
function toggle(id: number) {
  const next = new Set(checked.value);
  next.has(id) ? next.delete(id) : next.add(id);
  checked.value = next;
}
async function save() {
  if (!roleId.value) return;
  saving.value = true;
  try {
    await api.patch(`/menu/roles/${roleId.value}`, {
      menuIds: [...checked.value],
    });
    toast({ title: "角色功能范围已更新", description: "新设置将在下次登录时生效" });
    await auth.fetchMe();
  } finally {
    saving.value = false;
  }
}
onMounted(loadRoles);
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">角色功能范围</h1>
      <p class="mt-2 text-sm text-neutral-500">
        为不同角色选择可使用的工作功能，保存后将于下次登录时生效。
      </p>
    </div>
    <div class="flex gap-3">
      <select
        v-model="roleId"
        class="h-10 rounded-xl px-3 ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800"
        @change="load"
      >
        <option v-for="role in roles" :key="role.id" :value="role.id">
          {{ role.name }} ({{ role.code }})
        </option>
      </select>
      <Button v-permission="'roleMenu:update'" :loading="saving" @click="save"
        >保存设置</Button
      >
    </div>
    <Card>
      <label
        v-for="item in flat"
        :key="item.node.id"
        class="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-900"
        :style="{ paddingLeft: `${12 + item.depth * 20}px` }"
      >
        <input
          type="checkbox"
          :checked="checked.has(item.node.id)"
          @change="toggle(item.node.id)"
        />
        <span class="font-medium">{{ item.node.name }}</span>
      </label>
    </Card>
  </div>
</template>
