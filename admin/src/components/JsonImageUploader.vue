<script setup lang="ts">
import { computed } from "vue";
import { ElMessage, ElUpload } from "element-plus";
import { Plus } from "lucide-vue-next";
import { api, getAccessToken } from "../api";

const props = withDefaults(
  defineProps<{
    modelValue: string[];
    disabled?: boolean;
    max?: number;
  }>(),
  {
    modelValue: () => [],
    disabled: false,
    max: 9,
  },
);

const emit = defineEmits<{
  (event: "update:modelValue", value: string[]): void;
}>();

const uploadUrl = computed(
  () => `${String(api.defaults.baseURL ?? "").replace(/\/$/, "")}/file/upload`,
);

function resolveUrl(path: string): string {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = String(api.defaults.baseURL ?? "");
  try {
    return `${base ? new URL(base, window.location.origin).origin : window.location.origin}${normalized}`;
  } catch {
    return `${window.location.origin}${normalized}`;
  }
}

function onSuccess(response: any) {
  const path = response?.data?.relativePath ?? response?.relativePath;
  if (typeof path !== "string" || !path.trim()) {
    ElMessage.error("图片上传失败，请稍后重试");
    return;
  }
  emit("update:modelValue", [...props.modelValue, path.trim()]);
}

function onRemove(file: any) {
  const path = props.modelValue.find((item) => resolveUrl(item) === file?.url);
  if (!path) return;
  emit(
    "update:modelValue",
    props.modelValue.filter((item) => item !== path),
  );
}
</script>

<template>
  <ElUpload
    :file-list="
      modelValue.map((path, index) => ({
        name: String(index),
        url: resolveUrl(path),
      }))
    "
    :action="uploadUrl"
    :headers="{ Authorization: `Bearer ${getAccessToken() ?? ''}` }"
    :limit="max"
    :disabled="disabled"
    accept="image/jpeg,image/png,image/webp,image/gif"
    list-type="picture-card"
    :on-success="onSuccess"
    :on-remove="onRemove"
  >
    <Plus class="h-5 w-5" />
  </ElUpload>
</template>
