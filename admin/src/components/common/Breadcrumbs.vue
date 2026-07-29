<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore, type MenuNode } from "../../stores/auth";

const route = useRoute();
const authStore = useAuthStore();

type Crumb = { name: string; path: string };

function findCrumbs(
  nodes: MenuNode[],
  targetPath: string,
  trail: Crumb[] = [],
): Crumb[] | null {
  for (const node of nodes) {
    const nextTrail = [...trail, { name: node.name, path: node.path }];
    if (node.path === targetPath) return nextTrail;
    if (node.children?.length) {
      const hit = findCrumbs(node.children, targetPath, nextTrail);
      if (hit) return hit;
    }
  }
  return null;
}

const crumbs = computed(() => {
  const target = route.path;
  const hit = findCrumbs(authStore.menuTree ?? [], target);
  if (hit && hit.length) return hit;
  const title = typeof route.meta?.title === "string" ? route.meta.title : "";
  if (title) return [{ name: title, path: target }];
  return [];
});
</script>

<template>
  <nav
    v-if="crumbs.length"
    aria-label="Breadcrumb"
    class="flex flex-wrap items-center gap-2 text-xs"
  >
    <span
      v-for="(c, idx) in crumbs"
      :key="c.path + idx"
      class="flex items-center gap-2 text-neutral-500 dark:text-neutral-400"
    >
      <span
        class="truncate"
        :class="
          idx === crumbs.length - 1
            ? 'font-semibold text-neutral-800 dark:text-neutral-200'
            : ''
        "
      >
        {{ c.name }}
      </span>
      <span
        v-if="idx !== crumbs.length - 1"
        class="text-neutral-400 dark:text-neutral-600"
        >/</span
      >
    </span>
  </nav>
</template>
