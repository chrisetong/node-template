<script setup lang="ts">
import { computed, ref } from "vue";
import { ImagePlus, Trash2 } from "lucide-vue-next";
import { api } from "../api";
import { resolveAssetUrl } from "../stores/system-setting";
import { Button } from "./ui/button";
import { toast } from "./ui/toast";

const props = defineProps<{
  modelValue: string;
  kind: "logo" | "background";
  label: string;
  hint: string;
  recommendedSize: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (event: "update:modelValue", value: string): void;
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const previewUrl = computed(() => resolveAssetUrl(props.modelValue));

async function onPick(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file || props.disabled || uploading.value) return;

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) {
    toast({
      title: "图片不符合要求",
      description: "请选择不超过 5 MiB 的 JPG、PNG、WebP 或 GIF 图片",
      variant: "destructive",
    });
    return;
  }

  uploading.value = true;
  try {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post<{ relativePath: string }>(
      `/system-setting/upload/${props.kind}`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    if (!data.relativePath) throw new Error("empty upload path");
    emit("update:modelValue", data.relativePath);
  } catch {
    toast({
      title: "上传失败",
      description: "请确认图片类型和大小后重试",
      variant: "destructive",
    });
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <div class="field">
    <label>{{ label }}</label>
    <div class="upload-box" :class="{ 'is-background': kind === 'background' }">
      <img v-if="previewUrl" :src="previewUrl" alt="" />
      <div v-else class="upload-empty">
        <ImagePlus class="h-6 w-6" />
        <span>未设置图片</span>
      </div>
      <div class="upload-actions">
        <input
          ref="inputRef"
          class="hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          :disabled="disabled || uploading"
          @change="onPick"
        />
        <Button
          size="sm"
          variant="secondary"
          :loading="uploading"
          :disabled="disabled"
          @click="inputRef?.click()"
        >
          {{ previewUrl ? "更换图片" : "上传图片" }}
        </Button>
        <Button
          v-if="previewUrl"
          size="sm"
          variant="ghost"
          :disabled="disabled || uploading"
          @click="emit('update:modelValue', '')"
        >
          <Trash2 class="h-4 w-4" />移除
        </Button>
      </div>
    </div>
    <p class="field-hint">
      推荐尺寸：{{ recommendedSize }}。{{ hint }}，支持 JPG、PNG、WebP、GIF，最大 5 MiB。
    </p>
  </div>
</template>

<style scoped>
.upload-box{position:relative;min-height:132px;overflow:hidden;border:1px dashed var(--border);border-radius:12px;background:var(--surface-soft)}
.upload-box.is-background{min-height:178px}.upload-box img{display:block;width:100%;height:132px;object-fit:contain;background:var(--surface-raised)}.upload-box.is-background img{height:178px;object-fit:cover}
.upload-empty{height:96px;display:grid;place-items:center;align-content:center;gap:7px;color:var(--text-muted);font-size:12px}.upload-actions{display:flex;justify-content:flex-end;gap:8px;padding:10px;background:var(--surface-raised);border-top:1px solid var(--border)}
</style>
