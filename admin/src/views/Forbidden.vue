<script setup lang="ts">
import { useRouter } from "vue-router";
import { ShieldX } from "lucide-vue-next";
import { Button } from "../components/ui/button";

const router = useRouter();
</script>

<template>
  <div class="min-h-full bg-white dark:bg-neutral-950">
    <div
      class="mx-auto flex min-h-full w-full max-w-xl flex-col justify-center px-6 py-16"
    >
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800"
        >
          <ShieldX class="h-5 w-5 text-neutral-900 dark:text-neutral-200" />
        </div>
        <div>
          <div
            class="text-sm font-medium text-neutral-600 dark:text-neutral-300"
          >
            403
          </div>
          <h1
            class="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50"
          >
            无权限访问
          </h1>
        </div>
      </div>
      <p class="mt-4 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
        你的角色没有访问该页面的权限。如需访问请联系管理员。
      </p>

      <div class="mt-8 flex gap-2">
        <Button variant="secondary" @click="router.replace('/')"
          >回到首页</Button
        >
        <Button variant="ghost" @click="router.replace({ name: 'login' })"
          >重新登录</Button
        >
      </div>
    </div>
  </div>
</template>
