<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api } from "../../api";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";

type AuditLog = {
  id: string;
  actorName: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  method: string;
  path: string;
  ip: string;
  statusCode: number;
  success: boolean;
  durationMs: number;
  createdAt: string;
};

const logs = ref<AuditLog[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const action = ref("");
const success = ref("");

async function load(reset = false) {
  if (reset) page.value = 1;
  const response = await api.get<{ items: AuditLog[]; total: number }>(
    "/audit-log",
    {
      params: {
        page: page.value,
        pageSize,
        action: action.value || undefined,
        success: success.value || undefined,
      },
    },
  );
  logs.value = response.data.items;
  total.value = response.data.total;
}

async function changePage(delta: number) {
  page.value += delta;
  await load();
}

onMounted(() => load());
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">审计日志</h1>
      <p class="mt-2 text-sm text-neutral-500">
        查看重要操作与资料变更，便于追溯日常工作记录。
      </p>
    </div>

    <Card>
      <div class="flex flex-wrap gap-3">
        <input
          v-model="action"
          placeholder="操作类型"
          class="h-10 rounded-xl px-3 ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800"
        />
        <select
          v-model="success"
          class="h-10 rounded-xl px-3 ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800"
        >
          <option value="">全部结果</option>
          <option value="true">成功</option>
          <option value="false">失败</option>
        </select>
        <Button variant="secondary" @click="load(true)">筛选</Button>
      </div>
    </Card>

    <Card>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="text-xs text-neutral-500">
              <th class="p-3">时间</th>
              <th class="p-3">操作者</th>
              <th class="p-3">操作</th>
              <th class="p-3">目标</th>
              <th class="p-3">结果</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="log in logs"
              :key="log.id"
              class="border-t border-neutral-200 dark:border-neutral-800"
            >
              <td class="whitespace-nowrap p-3">
                {{ new Date(log.createdAt).toLocaleString() }}
              </td>
              <td class="p-3">{{ log.actorName ?? "匿名" }}</td>
              <td class="p-3 font-mono text-xs">{{ log.action }}</td>
              <td class="p-3">
                {{ log.resource
                }}{{ log.resourceId ? ` #${log.resourceId}` : "" }}
              </td>
              <td
                class="p-3"
                :class="log.success ? 'text-emerald-600' : 'text-red-600'"
              >
                {{ log.success ? "成功" : "未完成" }}
              </td>
            </tr>
            <tr v-if="!logs.length">
              <td colspan="5" class="p-8 text-center text-neutral-500">
                暂无日志
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        class="mt-4 flex items-center justify-between text-sm text-neutral-500"
      >
        <span>共 {{ total }} 条，第 {{ page }} 页</span>
        <div class="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            :disabled="page <= 1"
            @click="changePage(-1)"
            >上一页</Button
          >
          <Button
            size="sm"
            variant="secondary"
            :disabled="page * pageSize >= total"
            @click="changePage(1)"
            >下一页</Button
          >
        </div>
      </div>
    </Card>
  </div>
</template>
