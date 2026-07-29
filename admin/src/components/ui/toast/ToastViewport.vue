<script setup lang="ts">
import { X } from "lucide-vue-next";
import { useToasts } from "./use-toast";

const { toasts, dismiss } = useToasts();
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed right-4 top-4 z-[9999] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2"
    >
      <div
        v-for="t in toasts"
        :key="t.id"
        class="rounded-2xl bg-white p-4 ring-1 ring-neutral-200 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.35)] dark:bg-neutral-950 dark:ring-neutral-800 dark:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]"
        :class="t.variant === 'destructive' ? 'ring-red-500/30' : ''"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <div
              class="text-sm font-semibold text-neutral-900 dark:text-neutral-50"
            >
              {{ t.title }}
            </div>
            <div
              v-if="t.description"
              class="mt-1 text-sm leading-5 text-neutral-600 dark:text-neutral-400"
            >
              {{ t.description }}
            </div>
          </div>
          <button
            class="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-300 dark:ring-neutral-800 dark:hover:bg-neutral-800"
            type="button"
            @click="dismiss(t.id)"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
