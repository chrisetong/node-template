<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { Bold, Italic, Link2, List, Underline } from "lucide-vue-next";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    placeholder?: string;
    disabled?: boolean;
  }>(),
  {
    modelValue: "",
    placeholder: "请输入内容…",
    disabled: false,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const editorEl = ref<HTMLDivElement | null>(null);
const focused = ref(false);

const isEmpty = computed(() => {
  const html = (props.modelValue ?? "").trim();
  if (!html) return true;
  const text = html.replace(/<[^>]*>/g, "").trim();
  return !text;
});

function setHtml(html: string) {
  const el = editorEl.value;
  if (!el) return;
  el.innerHTML = html;
}

function getHtml(): string {
  const el = editorEl.value;
  if (!el) return "";
  return el.innerHTML;
}

function emitChange() {
  emit("update:modelValue", getHtml());
}

function exec(command: string, value?: string) {
  if (props.disabled) return;
  const el = editorEl.value;
  if (!el) return;
  el.focus();
  document.execCommand(command, false, value);
  emitChange();
}

function addLink() {
  if (props.disabled) return;
  const url = globalThis.prompt?.("请输入链接 URL");
  if (!url) return;
  exec("createLink", url);
}

function onKeyDown(e: KeyboardEvent) {
  if (props.disabled) return;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
    e.preventDefault();
    exec("bold");
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
    e.preventDefault();
    exec("italic");
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "u") {
    e.preventDefault();
    exec("underline");
  }
}

watch(
  () => props.modelValue,
  async (v) => {
    if (focused.value) return;
    await nextTick();
    if (getHtml().trim() === String(v ?? "").trim()) return;
    setHtml(String(v ?? ""));
  },
);

onMounted(() => {
  setHtml(String(props.modelValue ?? ""));
});

onBeforeUnmount(() => {
  focused.value = false;
});
</script>

<template>
  <div class="grid gap-2">
    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-neutral-100 px-3 text-xs font-semibold text-neutral-800 ring-1 ring-neutral-200 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-200 dark:ring-neutral-800 dark:hover:bg-neutral-800"
        :disabled="disabled"
        @click="exec('bold')"
      >
        <Bold class="h-4 w-4" />
        加粗
      </button>
      <button
        type="button"
        class="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-neutral-100 px-3 text-xs font-semibold text-neutral-800 ring-1 ring-neutral-200 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-200 dark:ring-neutral-800 dark:hover:bg-neutral-800"
        :disabled="disabled"
        @click="exec('italic')"
      >
        <Italic class="h-4 w-4" />
        斜体
      </button>
      <button
        type="button"
        class="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-neutral-100 px-3 text-xs font-semibold text-neutral-800 ring-1 ring-neutral-200 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-200 dark:ring-neutral-800 dark:hover:bg-neutral-800"
        :disabled="disabled"
        @click="exec('underline')"
      >
        <Underline class="h-4 w-4" />
        下划线
      </button>
      <button
        type="button"
        class="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-neutral-100 px-3 text-xs font-semibold text-neutral-800 ring-1 ring-neutral-200 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-200 dark:ring-neutral-800 dark:hover:bg-neutral-800"
        :disabled="disabled"
        @click="exec('insertUnorderedList')"
      >
        <List class="h-4 w-4" />
        列表
      </button>
      <button
        type="button"
        class="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-neutral-100 px-3 text-xs font-semibold text-neutral-800 ring-1 ring-neutral-200 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-200 dark:ring-neutral-800 dark:hover:bg-neutral-800"
        :disabled="disabled"
        @click="addLink"
      >
        <Link2 class="h-4 w-4" />
        链接
      </button>
    </div>

    <div class="relative">
      <div
        v-if="isEmpty"
        class="pointer-events-none absolute left-4 top-3 text-sm text-neutral-400 dark:text-neutral-500"
      >
        {{ placeholder }}
      </div>
      <div
        ref="editorEl"
        class="min-h-[160px] w-full rounded-xl bg-white px-4 py-3 text-sm text-neutral-900 ring-1 ring-neutral-200 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-neutral-900 dark:text-neutral-50 dark:ring-neutral-800"
        :contenteditable="!disabled"
        @focus="focused = true"
        @blur="
          () => {
            focused = false;
            emitChange();
          }
        "
        @input="emitChange"
        @keydown="onKeyDown"
      />
    </div>
  </div>
</template>
