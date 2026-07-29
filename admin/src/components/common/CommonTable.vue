<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RefreshCcw, Search, Trash2 } from "lucide-vue-next";
import { useAuthStore } from "../../stores/auth";
import { api } from "../../api";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Table } from "../ui/table";

type Row = Record<string, any>;

export type CommonColumn = {
  label: string;
  key: string;
  type?: "text" | "date" | "boolean" | "image" | "images" | "tag";
  tagMap?: Record<string, { label: string; className: string }>;
  tagDefaultClassName?: string;
};

type LoadResult = {
  items: Row[];
  total: number;
};

const props = defineProps<{
  title: string;
  columns: CommonColumn[];
  load: (params: {
    q: string;
    page: number;
    pageSize: number;
  }) => Promise<LoadResult>;
  rowKey?: (row: Row) => string | number;
  deletePermission?: string;
  canDelete?: (row: Row) => boolean;
}>();

const emit = defineEmits<{
  (e: "create"): void;
  (e: "edit", row: Row): void;
  (e: "delete", row: Row): void;
}>();

const authStore = useAuthStore();

const q = ref("");
const page = ref(1);
const pageSize = ref(10);

const loading = ref(false);
const items = ref<Row[]>([]);
const total = ref(0);

const canShowDelete = computed(() => {
  const perm = props.deletePermission;
  if (!perm) return false;
  return authStore.permissions.includes(perm);
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(total.value / pageSize.value)),
);

const previewOpen = ref(false);
const previewUrl = ref("");

function resolveImageUrl(row: Row, key: string): string {
  const urlKey = `${key}Url`;
  const raw = typeof row?.[urlKey] === "string" ? row[urlKey] : row?.[key];
  if (typeof raw !== "string") return "";
  const value = raw.trim();
  if (!value) return "";
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:")
  )
    return value;
  const path = value.startsWith("/") ? value : `/${value}`;
  const base = String(api.defaults.baseURL ?? "").trim();
  if (base.startsWith("http://") || base.startsWith("https://")) {
    try {
      return `${new URL(base).origin}${path}`;
    } catch {
      return `${base.replace(/\/$/, "")}${path}`;
    }
  }
  return `${window.location.origin}${path}`;
}

function openPreview(url: string) {
  previewUrl.value = url;
  previewOpen.value = true;
}

function keyOf(row: Row, index: number) {
  if (props.rowKey) return props.rowKey(row);
  const id = row.id;
  return typeof id === "string" || typeof id === "number" ? id : index;
}

function formatCell(value: any, type: CommonColumn["type"]) {
  if (type === "boolean") return value ? "是" : "否";
  if (type === "image") return value ? "图片" : "-";
  if (type === "images") {
    if (!Array.isArray(value) || value.length === 0) return "-";
    return `${value.length} 张`;
  }
  if (type === "tag")
    return value === null || value === undefined || value === ""
      ? "-"
      : String(value);
  if (type === "date") {
    if (!value) return "-";
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  }
  return value === null || value === undefined || value === ""
    ? "-"
    : String(value);
}

async function refresh() {
  if (loading.value) return;
  loading.value = true;
  try {
    const res = await props.load({
      q: q.value.trim(),
      page: page.value,
      pageSize: pageSize.value,
    });
    items.value = res.items ?? [];
    total.value = res.total ?? 0;
    if (page.value > totalPages.value) page.value = totalPages.value;
  } finally {
    loading.value = false;
  }
}

function onSearch() {
  page.value = 1;
  void refresh();
}

function goPrev() {
  if (page.value <= 1) return;
  page.value -= 1;
}

function goNext() {
  if (page.value >= totalPages.value) return;
  page.value += 1;
}

watch([page, pageSize], () => {
  void refresh();
});

onMounted(refresh);
</script>

<template>
  <div class="w-full">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <h1
          class="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50"
        >
          {{ title }}
        </h1>
        <p
          class="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400"
        >
          查看和维护当前业务信息，可通过关键词快速查找。
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <Button
          variant="secondary"
          :loading="loading"
          :disabled="loading"
          @click="refresh"
        >
          <RefreshCcw class="h-4 w-4" />
          刷新
        </Button>
        <slot name="primary">
          <Button @click="emit('create')">新增</Button>
        </slot>
      </div>
    </div>

    <div class="mt-6 flex flex-wrap items-center justify-between gap-3">
      <div class="flex min-w-0 flex-1 items-center gap-2">
        <div class="relative w-full max-w-md">
          <Search
            class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          />
          <input
            v-model="q"
            class="h-11 w-full rounded-xl bg-white pl-10 pr-3 text-sm text-neutral-900 ring-1 ring-neutral-200 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-neutral-900 dark:text-neutral-50 dark:ring-neutral-800 dark:placeholder:text-neutral-500"
            placeholder="搜索…"
            @keydown.enter="onSearch"
          />
        </div>
        <Button
          variant="secondary"
          :loading="loading"
          :disabled="loading"
          @click="onSearch"
          >搜索</Button
        >
      </div>

      <div class="flex items-center gap-2">
        <label class="text-xs text-neutral-500 dark:text-neutral-400"
          >每页</label
        >
        <select
          v-model.number="pageSize"
          class="h-10 rounded-xl bg-white px-3 text-sm text-neutral-900 ring-1 ring-neutral-200 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-neutral-900 dark:text-neutral-50 dark:ring-neutral-800"
        >
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
        </select>
      </div>
    </div>

    <div class="mt-4">
      <Card>
        <Table>
          <thead
            class="bg-neutral-50 text-neutral-600 dark:bg-neutral-900/40 dark:text-neutral-300"
          >
            <tr>
              <th
                v-for="c in columns"
                :key="c.key"
                class="px-4 py-3 text-left text-xs font-semibold"
              >
                {{ c.label }}
              </th>
              <th class="px-4 py-3 text-right text-xs font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, idx) in items"
              :key="keyOf(row, idx)"
              class="border-t border-neutral-200 text-neutral-800 hover:bg-neutral-50 dark:border-neutral-900/80 dark:text-neutral-200 dark:hover:bg-neutral-900/20"
            >
              <td v-for="c in columns" :key="c.key" class="px-4 py-3 text-sm">
                <slot :name="`cell:${c.key}`" :row="row" :value="row[c.key]">
                  <button
                    v-if="c.type === 'image'"
                    type="button"
                    class="inline-flex items-center gap-2 rounded-xl bg-neutral-50 px-2 py-1 text-xs font-semibold text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-100 dark:bg-neutral-900/40 dark:text-neutral-200 dark:ring-neutral-800 dark:hover:bg-neutral-900"
                    :disabled="!resolveImageUrl(row, c.key)"
                    @click="openPreview(resolveImageUrl(row, c.key))"
                  >
                    <img
                      v-if="resolveImageUrl(row, c.key)"
                      :src="resolveImageUrl(row, c.key)"
                      class="h-7 w-7 rounded-lg object-cover ring-1 ring-neutral-200 dark:ring-neutral-800"
                      alt=""
                      loading="lazy"
                    />
                    <span>{{
                      resolveImageUrl(row, c.key) ? "预览" : "-"
                    }}</span>
                  </button>
                  <span
                    v-else-if="c.type === 'images'"
                    class="inline-flex items-center gap-2 rounded-xl bg-neutral-50 px-2 py-1 text-xs font-semibold text-neutral-700 ring-1 ring-neutral-200 dark:bg-neutral-900/40 dark:text-neutral-200 dark:ring-neutral-800"
                  >
                    <template
                      v-if="Array.isArray(row[c.key]) && row[c.key].length > 0"
                    >
                      <img
                        :src="
                          resolveImageUrl({ [c.key]: row[c.key][0] }, c.key)
                        "
                        class="h-7 w-7 rounded-lg object-cover ring-1 ring-neutral-200 dark:ring-neutral-800"
                        alt=""
                        loading="lazy"
                      />
                      <span>{{ row[c.key].length }} 张</span>
                    </template>
                    <template v-else>-</template>
                  </span>
                  <span
                    v-else-if="c.type === 'tag'"
                    class="inline-flex items-center rounded-xl px-2 py-1 text-xs font-semibold ring-1"
                    :class="
                      c.tagMap?.[String(row[c.key])]?.className ??
                      c.tagDefaultClassName ??
                      'bg-neutral-50 text-neutral-700 ring-neutral-200 dark:bg-neutral-900/40 dark:text-neutral-200 dark:ring-neutral-800'
                    "
                  >
                    {{
                      c.tagMap?.[String(row[c.key])]?.label ??
                      formatCell(row[c.key], c.type)
                    }}
                  </span>
                  <span v-else class="text-neutral-900 dark:text-neutral-50">
                    {{ formatCell(row[c.key], c.type) }}
                  </span>
                </slot>
              </td>
              <td class="px-4 py-3 text-right">
                <div
                  class="ml-auto flex max-w-[340px] flex-wrap justify-end gap-2"
                >
                  <slot name="row-actions" :row="row">
                    <Button
                      size="sm"
                      variant="default"
                      @click="emit('edit', row)"
                      >编辑</Button
                    >
                    <Button
                      v-if="canShowDelete && (!canDelete || canDelete(row))"
                      size="sm"
                      variant="destructive"
                      @click="emit('delete', row)"
                    >
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  </slot>
                </div>
              </td>
            </tr>

            <tr v-if="!loading && items.length === 0">
              <td
                class="px-4 py-10 text-center text-sm text-neutral-500"
                :colspan="columns.length + 1"
              >
                暂无数据
              </td>
            </tr>
            <tr v-if="loading">
              <td
                class="px-4 py-10 text-center text-sm text-neutral-500"
                :colspan="columns.length + 1"
              >
                加载中…
              </td>
            </tr>
          </tbody>
        </Table>
      </Card>
    </div>

    <div class="mt-4 flex items-center justify-between">
      <div class="text-xs text-neutral-500 dark:text-neutral-400">
        共 {{ total }} 条，当前第 {{ page }} / {{ totalPages }} 页
      </div>
      <div class="flex items-center gap-2">
        <Button
          variant="secondary"
          :disabled="loading || page <= 1"
          @click="goPrev"
          >上一页</Button
        >
        <Button
          variant="secondary"
          :disabled="loading || page >= totalPages"
          @click="goNext"
          >下一页</Button
        >
      </div>
    </div>
  </div>

  <div
    v-if="previewOpen"
    class="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
    @click.self="previewOpen = false"
  >
    <div
      class="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-neutral-200 dark:bg-neutral-950 dark:ring-neutral-800"
    >
      <div
        class="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800"
      >
        <div
          class="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100"
        >
          图片预览
        </div>
        <Button size="sm" variant="secondary" @click="previewOpen = false"
          >关闭</Button
        >
      </div>
      <div class="p-4">
        <img
          v-if="previewUrl"
          :src="previewUrl"
          class="max-h-[70vh] w-full rounded-xl object-contain"
          alt=""
        />
      </div>
    </div>
  </div>
</template>
