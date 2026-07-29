<script setup lang="ts">
import { computed } from "vue";

type Variant = "default" | "secondary" | "destructive" | "ghost";
type Size = "default" | "sm" | "lg";

const props = withDefaults(
  defineProps<{
    type?: "button" | "submit" | "reset";
    variant?: Variant;
    size?: Size;
    disabled?: boolean;
    loading?: boolean;
  }>(),
  {
    type: "button",
    variant: "default",
    size: "default",
    disabled: false,
    loading: false,
  },
);

const isDisabled = computed(() => props.disabled || props.loading);

const classes = computed(() => {
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-1 ring-transparent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-60";

  const variants: Record<Variant, string> = {
    default:
      "bg-blue-600 text-white ring-blue-500/40 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500",
    secondary:
      "bg-neutral-100 text-neutral-900 ring-neutral-200 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-200 dark:ring-neutral-800 dark:hover:bg-neutral-800",
    destructive:
      "bg-red-600 text-white ring-red-500/40 hover:bg-red-500 dark:bg-red-500 dark:hover:bg-red-400",
    ghost:
      "bg-transparent text-neutral-900 ring-neutral-200/0 hover:bg-neutral-100 hover:ring-neutral-200 dark:text-neutral-200 dark:hover:bg-neutral-900 dark:hover:ring-neutral-800",
  };

  const sizes: Record<Size, string> = {
    default: "h-10 px-4",
    sm: "h-9 px-3 text-xs",
    lg: "h-11 px-5 text-base",
  };

  return [base, variants[props.variant], sizes[props.size]].join(" ");
});
</script>

<template>
  <button
    :class="classes"
    :disabled="isDisabled"
    :type="type"
    :aria-busy="loading ? 'true' : 'false'"
  >
    <span
      v-if="loading"
      class="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current"
    />
    <slot />
  </button>
</template>
