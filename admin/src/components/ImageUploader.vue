<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { api } from "../api";
import { Button } from "./ui/button";

type UploadStatus = "uploading" | "done" | "error";

type UploadItem = {
  id: string;
  fileName: string;
  previewUrl: string;
  progress: number;
  status: UploadStatus;
};

const props = defineProps<{
  modelValue: string[];
  disabled?: boolean;
  max?: number;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string[]): void;
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const queue = ref<UploadItem[]>([]);

const images = computed(() =>
  Array.isArray(props.modelValue)
    ? props.modelValue.filter((v) => typeof v === "string")
    : [],
);
const canAddMore = computed(() => {
  const max =
    typeof props.max === "number" && props.max > 0 ? props.max : Infinity;
  return (
    images.value.length +
      queue.value.filter((q) => q.status !== "error").length <
    max
  );
});

function resolvePreviewUrl(value: string): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:")
  )
    return raw;
  const path = raw.startsWith("/") ? raw : `/${raw}`;
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

function removeImageAt(index: number) {
  const next = images.value.slice();
  next.splice(index, 1);
  emit("update:modelValue", next);
}

function removeQueueItem(id: string) {
  const idx = queue.value.findIndex((q) => q.id === id);
  if (idx < 0) return;
  const item = queue.value[idx];
  if (item.previewUrl.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
  queue.value.splice(idx, 1);
}

async function uploadOne(file: File, item: UploadItem) {
  const form = new FormData();
  form.append("file", file);
  try {
    const { data } = await api.post<{ relativePath: string }>(
      "/file/upload",
      form,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          const total =
            typeof e.total === "number" && e.total > 0 ? e.total : 0;
          const loaded = typeof e.loaded === "number" ? e.loaded : 0;
          const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
          item.progress = Math.max(0, Math.min(100, pct));
        },
      },
    );

    const relativePath =
      typeof data?.relativePath === "string" ? data.relativePath.trim() : "";
    if (!relativePath) throw new Error("上传失败：返回路径为空");

    item.status = "done";
    item.progress = 100;
    emit("update:modelValue", [...images.value, relativePath]);
  } catch {
    item.status = "error";
  }
}

async function onPickFiles(e: Event) {
  const el = e.target as HTMLInputElement;
  const files = Array.from(el.files ?? []);
  el.value = "";
  if (!files.length) return;
  if (props.disabled) return;
  if (!canAddMore.value) return;

  const max =
    typeof props.max === "number" && props.max > 0 ? props.max : Infinity;
  const remaining = Math.max(0, max - images.value.length);
  const selected = files.slice(0, remaining);

  for (const file of selected) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const previewUrl = URL.createObjectURL(file);
    queue.value.push({
      id,
      fileName: file.name,
      previewUrl,
      progress: 0,
      status: "uploading",
    });
    const item = queue.value[queue.value.length - 1];
    void uploadOne(file, item);
  }
}

watch(
  () => props.modelValue,
  () => {
    const max =
      typeof props.max === "number" && props.max > 0 ? props.max : Infinity;
    if (images.value.length >= max) {
      queue.value = queue.value.filter((q) => q.status === "uploading");
    }
  },
  { deep: true },
);

onBeforeUnmount(() => {
  for (const item of queue.value) {
    if (item.previewUrl.startsWith("blob:"))
      URL.revokeObjectURL(item.previewUrl);
  }
});
</script>

<template>
  <div class="grid gap-3">
    <div
      class="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800"
    >
      <div class="min-w-0">
        <div class="text-xs text-neutral-500 dark:text-neutral-400">
          已选图片
        </div>
        <div
          class="mt-1 truncate text-xs font-semibold text-neutral-700 dark:text-neutral-200"
        >
          {{ images.length ? `已选 ${images.length} 张` : "未选择" }}
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <input
          ref="inputRef"
          type="file"
          accept="image/*"
          multiple
          class="hidden"
          :disabled="disabled || !canAddMore"
          @change="onPickFiles"
        />
        <Button
          size="sm"
          variant="secondary"
          type="button"
          :disabled="disabled || !canAddMore"
          @click="inputRef?.click()"
        >
          选择图片
        </Button>
      </div>
    </div>

    <div
      v-if="images.length || queue.length"
      class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div
        v-for="(img, idx) in images"
        :key="img + ':' + idx"
        class="group relative overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-200 dark:bg-neutral-950 dark:ring-neutral-800"
      >
        <img
          :src="resolvePreviewUrl(img)"
          class="h-40 w-full object-cover"
          alt=""
          loading="lazy"
        />
        <div
          class="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/70 to-black/0 px-3 py-3"
        >
          <div class="min-w-0 truncate text-xs font-semibold text-white">
            {{ img }}
          </div>
          <Button
            size="sm"
            variant="secondary"
            type="button"
            :disabled="disabled"
            @click="removeImageAt(idx)"
            >移除</Button
          >
        </div>
      </div>

      <div
        v-for="item in queue"
        :key="item.id"
        class="relative overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-200 dark:bg-neutral-950 dark:ring-neutral-800"
      >
        <img :src="item.previewUrl" class="h-40 w-full object-cover" alt="" />
        <div class="absolute inset-x-0 bottom-0 bg-black/65 px-3 py-3">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0 truncate text-xs font-semibold text-white">
              {{ item.fileName }}
            </div>
            <Button
              size="sm"
              variant="secondary"
              type="button"
              @click="removeQueueItem(item.id)"
            >
              {{ item.status === "error" ? "移除" : "取消" }}
            </Button>
          </div>

          <div class="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
            <div
              class="h-full rounded-full transition-all"
              :class="
                item.status === 'error'
                  ? 'bg-red-500'
                  : item.status === 'done'
                    ? 'bg-emerald-400'
                    : 'bg-sky-400'
              "
              :style="{ width: `${item.progress}%` }"
            />
          </div>
          <div class="mt-1 text-[11px] text-white/80">
            {{
              item.status === "error"
                ? "上传失败"
                : item.status === "done"
                  ? "已完成"
                  : `上传中 ${item.progress}%`
            }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
