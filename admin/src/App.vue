<template>
  <RouterView />
  <ToastViewport />
</template>

<script setup lang="ts">
import { watch } from "vue";
import { useRoute } from "vue-router";
import { ToastViewport } from "./components/ui/toast";
import { useSystemSettingStore } from "./stores/system-setting";

const route = useRoute();
const settings = useSystemSettingStore();

watch(
  [() => route.meta.title, () => settings.displaySiteName],
  ([routeTitle]) => {
    settings.applyDocumentTitle(
      typeof routeTitle === "string" ? routeTitle : "",
    );
  },
  { immediate: true },
);
</script>
