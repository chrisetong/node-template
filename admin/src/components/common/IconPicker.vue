<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { elementPlusMenuIcons } from "../../lib/element-icons";
import { resolveAppIcon } from "../../lib/app-icons";
import { lucideCommonIcons, lucideIconMap } from "../../lib/lucide-icons";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    placeholder?: string;
  }>(),
  {
    modelValue: "CircleDot",
    placeholder: "搜索图标名称或分类…",
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const triggerEl = ref<HTMLElement | null>(null);
const popoverEl = ref<HTMLElement | null>(null);
const open = ref(false);
const q = ref("");
const popoverStyle = ref<Record<string, string>>({});

const allItems = computed(() => {
  const legacyIcons = lucideCommonIcons.map((name) => ({
    name,
    label: name,
    source: "常用",
    component: lucideIconMap[name],
  }));
  return [
    ...elementPlusMenuIcons.map((item) => ({ ...item, source: "Element Plus" })),
    ...legacyIcons,
  ];
});

const items = computed(() => {
  const query = q.value.trim().toLowerCase();
  const list = allItems.value;
  if (!query) return list;
  return list.filter((item) =>
    `${item.name} ${item.label} ${item.source}`.toLowerCase().includes(query),
  );
});

const selectedIcon = computed(() => resolveAppIcon(props.modelValue));
const selectedLabel = computed(
  () =>
    allItems.value.find((item) => item.name === props.modelValue)?.label ??
    props.modelValue ??
    "默认图标",
);

function select(name: string) {
  emit("update:modelValue", name);
  open.value = false;
}

function toggle() {
  open.value = !open.value;
  if (open.value) q.value = "";
  if (open.value) updatePopoverPosition();
}

function close() {
  open.value = false;
}

function updatePopoverPosition() {
  const el = triggerEl.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const top = rect.bottom + 8;
  const maxHeight = Math.max(240, window.innerHeight - top - 16);

  popoverStyle.value = {
    position: "fixed",
    left: `${Math.max(8, rect.left)}px`,
    top: `${top}px`,
    width: `${Math.max(240, rect.width)}px`,
    maxHeight: `${maxHeight}px`,
    // AppDrawer is an Element Plus Drawer (z-index around 2000). The picker
    // is teleported to body, so it must sit above the drawer instead of under
    // its overlay.
    zIndex: "3000",
  };
}

function onDocPointerDown(e: PointerEvent) {
  if (!open.value) return;
  const target = e.target as Node | null;
  const trigger = triggerEl.value;
  const popover = popoverEl.value;
  if (target && trigger && trigger.contains(target)) return;
  if (target && popover && popover.contains(target)) return;
  close();
}

function onDocKeyDown(e: KeyboardEvent) {
  if (!open.value) return;
  if (e.key === "Escape") close();
}

function onWindowResize() {
  if (!open.value) return;
  updatePopoverPosition();
}

function onWindowScroll() {
  if (!open.value) return;
  updatePopoverPosition();
}

window.addEventListener("pointerdown", onDocPointerDown, true);
window.addEventListener("keydown", onDocKeyDown);
window.addEventListener("resize", onWindowResize);
window.addEventListener("scroll", onWindowScroll, true);
onMounted(() => {
  if (open.value) updatePopoverPosition();
});
onBeforeUnmount(() => {
  window.removeEventListener("pointerdown", onDocPointerDown, true);
  window.removeEventListener("keydown", onDocKeyDown);
  window.removeEventListener("resize", onWindowResize);
  window.removeEventListener("scroll", onWindowScroll, true);
});
</script>

<template>
  <div class="relative">
    <button
      ref="triggerEl"
      type="button"
      class="flex w-full items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-left ring-1 ring-neutral-200 transition hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-neutral-900 dark:ring-neutral-800 dark:hover:bg-neutral-800"
      @click="toggle"
    >
      <div class="flex min-w-0 items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 ring-1 ring-neutral-200 dark:bg-neutral-950 dark:ring-neutral-800"
        >
          <component
            :is="selectedIcon"
            class="h-5 w-5 text-neutral-900 dark:text-neutral-200"
          />
        </div>
        <div class="min-w-0">
          <div
            class="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50"
          >
            {{ selectedLabel }}
          </div>
          <div class="text-xs text-neutral-500 dark:text-neutral-400">
            点击选择图标
          </div>
        </div>
      </div>
      <div class="text-xs text-neutral-500 dark:text-neutral-400">
        {{ open ? "收起" : "展开" }}
      </div>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="popoverEl"
        class="rounded-2xl bg-white p-3 shadow-xl ring-1 ring-neutral-200 dark:bg-neutral-950 dark:ring-neutral-800"
        :style="popoverStyle"
      >
        <div class="flex items-center gap-2">
          <input
            v-model="q"
            class="h-10 w-full rounded-xl bg-white px-3 text-sm text-neutral-900 ring-1 ring-neutral-200 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-900 dark:text-neutral-50 dark:ring-neutral-800 dark:placeholder:text-neutral-500"
            :placeholder="placeholder"
          />
          <button
            type="button"
            class="h-10 rounded-xl bg-neutral-100 px-3 text-xs font-semibold text-neutral-900 ring-1 ring-neutral-200 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-200 dark:ring-neutral-800 dark:hover:bg-neutral-800"
            @click="close"
          >
            关闭
          </button>
        </div>

        <div
          class="mt-3 overflow-auto rounded-2xl ring-1 ring-neutral-200 dark:ring-neutral-800"
          style="max-height: calc(100vh - 150px)"
        >
          <div class="grid grid-cols-3 gap-1 p-2 sm:grid-cols-5">
            <button
              v-for="item in items"
              :key="item.name"
              type="button"
              class="group flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center text-sm ring-1 ring-transparent transition hover:bg-blue-50 hover:ring-blue-200 dark:hover:bg-blue-500/10 dark:hover:ring-blue-500/30"
              :class="
                item.name === modelValue
                  ? 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-200 dark:ring-blue-500/30'
                  : ''
              "
              @click="select(item.name)"
            >
              <component :is="item.component" class="h-5 w-5 opacity-90" />
              <span
                class="truncate text-xs font-semibold text-neutral-700 group-hover:text-neutral-900 dark:text-neutral-300 dark:group-hover:text-neutral-50"
              >
                {{ item.label }}
              </span>
            </button>
          </div>

          <div
            v-if="items.length === 0"
            class="px-4 py-10 text-center text-sm text-neutral-500"
          >
            没有匹配的图标
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
