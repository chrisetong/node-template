<script setup lang="ts">
import { computed, ref, useSlots } from "vue";
import { useRouter } from "vue-router";
import { ChevronDown, Plus, Search, Trash2 } from "lucide-vue-next";
import {
  ElButton,
  ElDatePicker,
  ElInput,
  ElMessageBox,
  ElOption,
  ElSelect,
} from "element-plus";
import { Button } from "../ui/button";
import { toast } from "../ui/toast";
import CommonTable from "./CommonTable.vue";
import CommonForm from "./CommonForm.vue";
import { lucideIconMap } from "../../lib/lucide-icons";
import { useAuthStore } from "../../stores/auth";
import type { AdvancedSearchField, GenericCrudMeta } from "./generic-crud";
type Row = Record<string, any>;

const props = defineProps<{
  meta: GenericCrudMeta<any>;
}>();

const router = useRouter();
const authStore = useAuthStore();
const slots = useSlots();

const formOpen = ref(false);
const submitting = ref(false);
const model = ref<Record<string, any>>({});
const editingId = ref<number | null>(null);
const tableKey = ref(0);
const searchExpanded = ref(false);
const advancedModel = ref<Record<string, any>>(
  props.meta.advancedSearch?.initialModel?.() ?? {},
);
const forwardedCellSlots = computed(() => {
  return Object.keys(slots).filter((k) => k.startsWith("cell:"));
});

function toggleSearch() {
  searchExpanded.value = !searchExpanded.value;
}

function refreshTable() {
  tableKey.value += 1;
}

const fields = computed(() => {
  return props.meta.fields({
    model: model.value,
    editing: editingId.value !== null,
  });
});

const customColumns = computed(() => {
  return props.meta.columns.filter((col) => {
    return (
      col.key === props.meta.iconColumnKey ||
      Boolean(props.meta.valueLabels?.[col.key])
    );
  });
});

const canShowDelete = computed(() => {
  const perm = props.meta.deletePermission;
  if (!perm) return false;
  return authStore.permissions.includes(perm);
});

function openCreate() {
  editingId.value = null;
  model.value = props.meta.initialModel();
  formOpen.value = true;
}

function openEdit(row: Row) {
  const id = Number(row.id);
  if (!Number.isFinite(id)) return;
  editingId.value = id;
  model.value = props.meta.mapRowToModel(row);
  formOpen.value = true;
}

async function load(params: { q: string; page: number; pageSize: number }) {
  return props.meta.load({
    ...params,
    ...(props.meta.advancedSearch ? advancedModel.value : {}),
  });
}

function resolveIcon(name: string) {
  return lucideIconMap[name] ?? lucideIconMap.Bell;
}

function resolveLabel(columnKey: string, value: unknown) {
  const map = props.meta.valueLabels?.[columnKey];
  if (!map) return value == null || value === "" ? "-" : String(value);
  const key = value == null ? "" : String(value);
  return map[key] ?? (key || "-");
}

function canShowRowAction(action: { permission?: string }) {
  const perm = action.permission;
  if (!perm) return true;
  return authStore.permissions.includes(perm);
}

async function runRowAction(
  action: {
    label: string;
    to?: (row: any) => any;
    openInNewTab?: boolean;
    onClick?: (row: any) => void | Promise<void>;
    confirm?: {
      title?: string;
      message: string;
      confirmButtonText?: string;
      cancelButtonText?: string;
    };
    successMessage?: string;
  },
  row: Row,
) {
  if (typeof action.onClick === "function") {
    if (action.confirm?.message) {
      try {
        await ElMessageBox.confirm(
          action.confirm.message,
          action.confirm.title ?? "提示",
          {
            type: "warning",
            confirmButtonText: action.confirm.confirmButtonText ?? "确认",
            cancelButtonText: action.confirm.cancelButtonText ?? "取消",
          },
        );
      } catch {
        return;
      }
    }

    try {
      await action.onClick(row);
      toast({
        title: "操作成功",
        description: action.successMessage ?? `${action.label}成功`,
      });
      tableKey.value += 1;
    } catch {
      toast({
        title: "操作失败",
        description: "操作未完成，请稍后重试",
        variant: "destructive",
      });
    }
    return;
  }

  if (typeof action.to !== "function") return;
  const location = action.to(row);
  if (!location) return;
  if (action.openInNewTab) {
    const href = router.resolve(location as any).href;
    window.open(href, "_blank", "noopener");
    return;
  }
  void router.push(location as any);
}

function onAdvancedSearch() {
  tableKey.value += 1;
}

function resetAdvanced() {
  advancedModel.value = props.meta.advancedSearch?.initialModel?.() ?? {};
  tableKey.value += 1;
}

function setAdvancedValue(name: string, value: any) {
  advancedModel.value = { ...advancedModel.value, [name]: value };
}

function renderAdvancedPlaceholder(field: AdvancedSearchField) {
  if (field.type !== "input") return undefined;
  return field.placeholder;
}

async function submit(values: Record<string, any>) {
  if (submitting.value) return;
  submitting.value = true;
  try {
    const payload = props.meta.schema.parse(values);
    if (editingId.value !== null) {
      await props.meta.update(editingId.value, payload);
      toast({
        title: props.meta.messages?.saveSuccessTitle ?? "保存成功",
        description: props.meta.messages?.updateSuccess ?? "记录已更新",
      });
    } else {
      await props.meta.create(payload);
      toast({
        title: props.meta.messages?.saveSuccessTitle ?? "保存成功",
        description: props.meta.messages?.createSuccess ?? "记录已创建",
      });
    }

    formOpen.value = false;
    tableKey.value += 1;
  } catch {
    toast({
      title: "操作失败",
      description: "操作未完成，请检查信息后重试",
      variant: "destructive",
    });
  } finally {
    submitting.value = false;
  }
}

async function remove(row: Row) {
  const title =
    typeof row.title === "string" && row.title.trim()
      ? row.title.trim()
      : `#${row.id ?? ""}`;
  try {
    await ElMessageBox.confirm(`确认删除「${title}」？`, "提示", {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消",
    });
  } catch {
    return;
  }
  try {
    await props.meta.remove(row);
    toast({
      title: props.meta.messages?.deleteSuccessTitle ?? "删除成功",
      description: props.meta.messages?.deleteSuccess ?? "记录已删除",
    });
    tableKey.value += 1;
  } catch {
    toast({
      title: "删除失败",
      description: "未能删除记录，请稍后重试",
      variant: "destructive",
    });
  }
}
</script>

<template>
  <div v-if="meta.advancedSearch" class="mb-6">
    <button
      class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
      @click="toggleSearch"
    >
      <Search class="h-4 w-4 opacity-70" />
      <span>高级检索</span>
      <ChevronDown
        class="h-4 w-4 transition-transform duration-200"
        :class="searchExpanded ? '' : '-rotate-90'"
      />
    </button>

    <div
      class="grid transition-all duration-200 ease-in-out"
      :style="{ gridTemplateRows: searchExpanded ? '1fr' : '0fr' }"
    >
      <div class="overflow-hidden p-px">
        <div
          class="mt-2 rounded-2xl bg-white p-5 ring-1 ring-neutral-200 dark:bg-neutral-950 dark:ring-neutral-800"
        >
          <div
            class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          >
            <div
              v-for="f in meta.advancedSearch.fields"
              :key="f.name"
              class="flex flex-col gap-2"
            >
              <label
                class="text-xs font-bold tracking-wide text-neutral-500 uppercase dark:text-neutral-400"
                >{{ f.label }}</label
              >

              <ElInput
                v-if="f.type === 'input'"
                :model-value="advancedModel[f.name]"
                :placeholder="renderAdvancedPlaceholder(f)"
                clearable
                @update:model-value="setAdvancedValue(f.name, $event)"
              />

              <ElSelect
                v-else-if="f.type === 'select'"
                :model-value="advancedModel[f.name]"
                class="w-full"
                @update:model-value="setAdvancedValue(f.name, $event)"
              >
                <ElOption
                  v-for="opt in f.options"
                  :key="String(opt.value)"
                  :label="opt.label"
                  :value="opt.value"
                />
              </ElSelect>

              <ElDatePicker
                v-else-if="f.type === 'datetime'"
                :model-value="advancedModel[f.name]"
                type="datetime"
                class="w-full"
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DDTHH:mm"
                @update:model-value="setAdvancedValue(f.name, $event)"
              />
            </div>
          </div>

          <div
            class="mt-4 flex items-center justify-end gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800"
          >
            <ElButton @click="resetAdvanced">重置</ElButton>
            <ElButton type="primary" @click="onAdvancedSearch">查询</ElButton>
          </div>
        </div>
      </div>
    </div>
  </div>

  <CommonTable
    :key="tableKey"
    :title="meta.title"
    :columns="meta.columns"
    :load="load"
    :delete-permission="meta.deletePermission"
    @create="openCreate"
    @edit="openEdit"
    @delete="remove"
  >
    <template
      v-for="name in forwardedCellSlots"
      :key="name"
      #[name]="slotProps"
    >
      <slot :name="name" v-bind="{ ...slotProps, refresh: refreshTable }" />
    </template>

    <template #primary>
      <Button
        v-if="meta.createPermission"
        v-permission="meta.createPermission"
        @click="openCreate"
      >
        <Plus class="h-4 w-4" />
        新增
      </Button>
      <Button v-else @click="openCreate">
        <Plus class="h-4 w-4" />
        新增
      </Button>
    </template>

    <template v-if="meta.rowActions?.length" #row-actions="{ row }">
      <slot
        name="row-actions"
        :row="row"
        :meta="meta"
        :run="runRowAction"
        :can-show="canShowRowAction"
        :open-edit="openEdit"
        :remove="remove"
        :can-show-delete="canShowDelete"
        :refresh="refreshTable"
      >
        <Button
          v-for="action in meta.rowActions"
          :key="action.key"
          v-show="canShowRowAction(action)"
          size="sm"
          :variant="action.variant ?? 'secondary'"
          @click="runRowAction(action as any, row as any)"
        >
          {{ action.label }}
        </Button>
        <Button size="sm" variant="default" @click="openEdit(row as any)"
          >编辑</Button
        >
        <Button
          v-if="canShowDelete"
          size="sm"
          variant="destructive"
          @click="remove(row as any)"
        >
          <Trash2 class="h-4 w-4" />
        </Button>
      </slot>
    </template>

    <template
      v-for="col in customColumns"
      :key="col.key"
      #[`cell:${col.key}`]="{ row, value }"
    >
      <div
        v-if="col.key === meta.iconColumnKey"
        class="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-100 ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800"
      >
        <component
          :is="resolveIcon(String((row as any)[col.key] ?? 'Bell'))"
          class="h-4 w-4 text-neutral-900 dark:text-neutral-200"
        />
      </div>
      <span v-else class="text-sm text-neutral-600 dark:text-neutral-400">
        {{ resolveLabel(col.key, value) }}
      </span>
    </template>
  </CommonTable>

  <CommonForm
    v-model:open="formOpen"
    v-model:modelValue="model"
    :title="
      editingId !== null
        ? (meta.formTitleEdit ?? '编辑')
        : (meta.formTitleCreate ?? '新增')
    "
    :description="meta.description"
    :fields="fields"
    :schema="meta.schema"
    :submitting="submitting"
    @submit="submit"
  />
</template>
