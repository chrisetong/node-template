<script setup lang="ts">
withDefaults(
  defineProps<{
    as?: "div" | "section" | "article";
  }>(),
  {
    as: "div",
  },
);
</script>

<template>
  <component
    :is="as"
    class="panel p-5"
  >
    <slot />
  </component>
</template>
