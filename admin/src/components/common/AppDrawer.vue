<script setup lang="ts">
import { computed } from "vue";
import { ElDrawer } from "element-plus";
import { X } from "lucide-vue-next";

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    description?: string;
    size?: string;
    busy?: boolean;
  }>(),
  { size: "600px", busy: false },
);

const emit = defineEmits<{ (e: "update:open", value: boolean): void }>();
const drawerSize = computed(() => `min(${props.size}, 100vw)`);
</script>

<template>
  <ElDrawer
    :model-value="open"
    :size="drawerSize"
    :close-on-click-modal="!busy"
    :close-on-press-escape="!busy"
    :show-close="false"
    class="app-drawer"
    @update:model-value="emit('update:open', $event)"
  >
    <template #header>
      <div class="app-drawer__heading">
        <div class="min-w-0">
          <h2>{{ title }}</h2>
          <p v-if="description">{{ description }}</p>
        </div>
        <button
          type="button"
          class="icon-button"
          aria-label="关闭"
          :disabled="busy"
          @click="emit('update:open', false)"
        >
          <X class="h-5 w-5" />
        </button>
      </div>
    </template>

    <div class="app-drawer__body"><slot /></div>

    <template #footer>
      <div class="app-drawer__footer">
        <slot name="footer">
          <button class="app-button secondary" @click="emit('update:open', false)">
            取消
          </button>
        </slot>
      </div>
    </template>
  </ElDrawer>
</template>
