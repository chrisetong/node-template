<script setup lang="ts">
import { computed } from "vue";
import { Building2, CalendarCheck2, ShieldCheck, UsersRound } from "lucide-vue-next";
import { Card } from "../components/ui/card";
import { useAuthStore } from "../stores/auth";
const auth=useAuthStore();
const greeting=computed(()=>{const h=new Date().getHours();return h<11?"早上好":h<14?"中午好":h<18?"下午好":"晚上好";});
const overview=computed(()=>[
  {title:"我的角色",value:auth.currentUser?.roles.map((r)=>r.name).join("、")||"成员",description:"当前工作职责",icon:ShieldCheck},
  {title:"所属部门",value:auth.currentUser?.department?.name||"暂未分配",description:"当前组织归属",icon:Building2},
  {title:"团队协作",value:"顺畅",description:"工作信息保持同步",icon:UsersRound},
  {title:"今日状态",value:"准备就绪",description:"开始安排今天的工作",icon:CalendarCheck2},
]);
</script>
<template>
  <div class="page-shell">
    <section class="welcome-banner"><div><span>{{greeting}}</span><h1>{{auth.currentUser?.username??"你好"}}，欢迎回来</h1><p>从清晰的信息开始，推进今天的重要工作。</p></div><div class="welcome-art" aria-hidden="true"><i/><i/><i/></div></section>
    <section><h2 class="mb-3 text-base font-semibold">工作概览</h2><div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Card v-for="item in overview" :key="item.title"><div class="flex items-start justify-between gap-3"><div><p class="text-xs text-slate-500">{{item.title}}</p><strong class="mt-3 block text-lg">{{item.value}}</strong><p class="mt-1 text-xs text-slate-400">{{item.description}}</p></div><span class="avatar"><component :is="item.icon" class="h-5 w-5"/></span></div></Card></div></section>
    <Card as="section"><div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 class="font-semibold">让工作保持清晰</h2><p class="mt-1 text-sm leading-6 text-slate-500">从左侧导航进入各项业务，及时维护团队与工作信息。</p></div><span class="status-pill success">运行良好</span></div></Card>
  </div>
</template>
<style scoped>
.welcome-banner{position:relative;min-height:190px;overflow:hidden;display:flex;align-items:center;padding:34px clamp(24px,5vw,56px);border-radius:18px;color:white;background:linear-gradient(125deg,#1c4c94,#2873ce);box-shadow:0 16px 36px rgba(26,76,148,.18)}.welcome-banner span{font-size:12px;opacity:.74}.welcome-banner h1{margin:8px 0;font-size:clamp(25px,3vw,34px);letter-spacing:-.03em}.welcome-banner p{margin:0;font-size:14px;opacity:.72}.welcome-art{position:absolute;right:7%;width:180px;height:130px}.welcome-art i{position:absolute;width:120px;height:34px;border:1px solid rgba(255,255,255,.24);border-radius:11px;transform:rotate(-28deg);background:rgba(255,255,255,.06)}.welcome-art i:nth-child(2){transform:translate(20px,42px) rotate(-28deg);background:rgba(255,255,255,.11)}.welcome-art i:nth-child(3){transform:translate(40px,84px) rotate(-28deg);background:rgba(255,255,255,.16)}@media(max-width:640px){.welcome-banner{min-height:170px}.welcome-art{right:-75px;opacity:.55}}
</style>
