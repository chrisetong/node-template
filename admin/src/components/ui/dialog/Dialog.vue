<script setup lang="ts">
import { computed, watchEffect } from "vue";

type Size = "sm" | "md" | "lg" | "xl";

const props = withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    description?: string;
    size?: Size;
  }>(),
  {
    size: "lg",
  },
);

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
}>();

const visible = computed(() => props.open);
const maxWidthClass = computed(() => {
  const map: Record<Size, string> = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-4xl",
  };
  return map[props.size];
});

function close() {
  emit("update:open", false);
}

watchEffect(() => {
  if (!visible.value) return;
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };
  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center px-6"
      role="dialog"
      aria-modal="true"
    >
      <div class="absolute inset-0 bg-black/60" @click="close" />
      <div
        class="relative z-10 w-full rounded-2xl bg-white p-6 ring-1 ring-neutral-200 dark:bg-neutral-950 dark:ring-neutral-800"
        :class="maxWidthClass"
      >
        <div class="mb-4">
          <div
            class="text-base font-semibold text-neutral-900 dark:text-neutral-50"
          >
            <slot name="title">
              {{ title }}
            </slot>
          </div>
          <div
            v-if="description || $slots.description"
            class="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400"
          >
            <slot name="description">
              {{ description }}
            </slot>
          </div>
        </div>

        <div
          class="-mx-2 -my-2 max-h-[68vh] overflow-x-hidden overflow-y-auto px-2 py-2 text-sm text-neutral-800 dark:text-neutral-200"
        >
          <slot />
        </div>

        <div class="mt-6 flex items-center justify-end gap-2">
          <slot name="footer" :close="close" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
